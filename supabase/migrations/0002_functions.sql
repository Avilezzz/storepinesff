-- ============================================================================
-- PinStore FF — Funciones de negocio
-- Todo movimiento de dinero vive aquí dentro, en una sola transacción.
-- ============================================================================

-- Helper: ¿el usuario actual es admin? SECURITY DEFINER para no chocar con RLS.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'ADMIN' and activo);
$$;

-- ────────────────────────────── CARRITO ─────────────────────────────────────

create or replace function fn_cart_set(p_product_id uuid, p_cantidad int)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NO_AUTH'; end if;

  if p_cantidad <= 0 then
    delete from cart_items where user_id = v_user and product_id = p_product_id;
    return;
  end if;

  if p_cantidad > 50 then raise exception 'MAX_50'; end if;
  if not exists (select 1 from products where id = p_product_id and activo) then
    raise exception 'PRODUCTO_NO_DISPONIBLE';
  end if;

  insert into cart_items (user_id, product_id, cantidad)
  values (v_user, p_product_id, p_cantidad)
  on conflict (user_id, product_id)
  do update set cantidad = excluded.cantidad, updated_at = now();
end $$;

-- ───────────────────────────── CHECKOUT ─────────────────────────────────────
-- Una sola transacción: bloquea billetera → recalcula precios desde la BD →
-- reserva códigos con SKIP LOCKED → debita → asienta en el libro mayor.
-- Cualquier fallo revierte absolutamente todo.

create or replace function fn_checkout(p_client_request_id text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_user     uuid   := auth.uid();
  v_total    bigint := 0;
  v_balance  bigint;
  v_order_id bigint;
  v_numero   text;
  v_item_id  bigint;
  v_tomados  int;
  r          record;
begin
  if v_user is null then raise exception 'NO_AUTH'; end if;
  if p_client_request_id is null or char_length(p_client_request_id) < 8 then
    raise exception 'REQUEST_ID_INVALIDO';
  end if;

  -- Idempotencia: doble clic o reintento de red devuelve la misma orden.
  select id into v_order_id from orders
   where user_id = v_user and client_request_id = p_client_request_id;
  if found then return v_order_id; end if;

  -- Bloqueo de la billetera. Serializa las compras de ESTE usuario, no las de todos.
  select balance_cents into v_balance from wallets where user_id = v_user for update;
  if not found then raise exception 'SIN_BILLETERA'; end if;

  -- El total se recalcula desde products. El precio que manda el navegador se ignora.
  select coalesce(sum(ci.cantidad * p.precio_cents), 0) into v_total
    from cart_items ci join products p on p.id = ci.product_id
   where ci.user_id = v_user and p.activo;

  if v_total <= 0    then raise exception 'CARRITO_VACIO'; end if;
  if v_balance < v_total then raise exception 'SALDO_INSUFICIENTE'; end if;

  v_numero := 'PS-' || to_char(now() at time zone 'America/Guayaquil', 'YYMMDD')
              || '-' || lpad(nextval('order_number_seq')::text, 5, '0');

  insert into orders (numero, user_id, total_cents, client_request_id)
  values (v_numero, v_user, v_total, p_client_request_id)
  returning id into v_order_id;

  for r in
    select ci.product_id, ci.cantidad, p.precio_cents, p.nombre
      from cart_items ci join products p on p.id = ci.product_id
     where ci.user_id = v_user and p.activo
     order by p.id                                   -- orden estable: evita deadlocks
  loop
    insert into order_items (order_id, product_id, producto_nombre,
                             cantidad, precio_unit_cents, subtotal_cents)
    values (v_order_id, r.product_id, r.nombre,
            r.cantidad, r.precio_cents, r.cantidad * r.precio_cents)
    returning id into v_item_id;

    -- SKIP LOCKED: dos compradores simultáneos nunca se llevan el mismo código
    -- y ninguno espera al otro.
    with elegidos as (
      select id from pin_codes
       where product_id = r.product_id and estado = 'DISPONIBLE'
       order by id
       for update skip locked
       limit r.cantidad
    )
    update pin_codes pc
       set estado = 'VENDIDO', order_item_id = v_item_id, sold_at = now()
      from elegidos e where pc.id = e.id;

    get diagnostics v_tomados = row_count;
    if v_tomados < r.cantidad then
      raise exception 'STOCK_INSUFICIENTE:%', r.nombre;   -- rollback total
    end if;
  end loop;

  update wallets set balance_cents = balance_cents - v_total, updated_at = now()
   where user_id = v_user;

  insert into wallet_ledger (user_id, tipo, amount_cents, balance_after_cents,
                             ref_type, ref_id, descripcion, created_by)
  values (v_user, 'COMPRA', -v_total, v_balance - v_total,
          'order', v_order_id::text, 'Orden ' || v_numero, v_user);

  delete from cart_items where user_id = v_user;

  insert into notifications (user_id, tipo, titulo, cuerpo, url)
  values (v_user, 'COMPRA', 'Compra completada',
          'Tu orden ' || v_numero || ' ya tiene los pines listos.',
          '/mis-compras/' || v_order_id);

  return v_order_id;
end $$;

-- ─────────────────────────────── RECARGAS ───────────────────────────────────

create or replace function fn_topup_aprobar(p_id bigint, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  t       record;
  v_bal   bigint;
begin
  if not is_admin() then raise exception 'SOLO_ADMIN'; end if;

  select * into t from topup_requests where id = p_id for update;
  if not found                 then raise exception 'NO_EXISTE'; end if;
  if t.estado <> 'PENDIENTE'   then raise exception 'YA_PROCESADA'; end if;

  select balance_cents into v_bal from wallets where user_id = t.user_id for update;
  if not found then raise exception 'SIN_BILLETERA'; end if;

  update wallets set balance_cents = balance_cents + t.amount_cents, updated_at = now()
   where user_id = t.user_id;

  insert into wallet_ledger (user_id, tipo, amount_cents, balance_after_cents,
                             ref_type, ref_id, descripcion, created_by)
  values (t.user_id, 'RECARGA', t.amount_cents, v_bal + t.amount_cents,
          'topup', p_id::text, 'Transferencia ' || t.banco || ' ref ' || t.numero_referencia, v_admin);

  update topup_requests
     set estado = 'APROBADA', revisado_por = v_admin, revisado_at = now(),
         nota_admin = coalesce(p_nota, nota_admin)
   where id = p_id;

  insert into notifications (user_id, tipo, titulo, cuerpo, url)
  values (t.user_id, 'RECARGA', 'Recarga aprobada',
          'Se acreditaron $' || to_char(t.amount_cents / 100.0, 'FM999990.00') || ' a tu billetera.',
          '/billetera');
end $$;

create or replace function fn_topup_rechazar(p_id bigint, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid(); t record;
begin
  if not is_admin() then raise exception 'SOLO_ADMIN'; end if;
  if p_nota is null or btrim(p_nota) = '' then raise exception 'MOTIVO_REQUERIDO'; end if;

  select * into t from topup_requests where id = p_id for update;
  if not found               then raise exception 'NO_EXISTE'; end if;
  if t.estado <> 'PENDIENTE' then raise exception 'YA_PROCESADA'; end if;

  update topup_requests
     set estado = 'RECHAZADA', revisado_por = v_admin, revisado_at = now(), nota_admin = p_nota
   where id = p_id;

  insert into notifications (user_id, tipo, titulo, cuerpo, url)
  values (t.user_id, 'RECARGA', 'Recarga rechazada', p_nota, '/billetera');
end $$;

-- Ajuste manual de saldo (correcciones, bonos, descuentos).
create or replace function fn_ajustar_saldo(p_user_id uuid, p_amount_cents bigint, p_motivo text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid(); v_bal bigint;
begin
  if not is_admin()                        then raise exception 'SOLO_ADMIN'; end if;
  if p_amount_cents = 0                    then raise exception 'MONTO_CERO'; end if;
  if p_motivo is null or btrim(p_motivo)='' then raise exception 'MOTIVO_REQUERIDO'; end if;

  select balance_cents into v_bal from wallets where user_id = p_user_id for update;
  if not found then raise exception 'SIN_BILLETERA'; end if;
  if v_bal + p_amount_cents < 0 then raise exception 'SALDO_INSUFICIENTE'; end if;

  update wallets set balance_cents = balance_cents + p_amount_cents, updated_at = now()
   where user_id = p_user_id;

  insert into wallet_ledger (user_id, tipo, amount_cents, balance_after_cents,
                             ref_type, ref_id, descripcion, created_by)
  values (p_user_id, 'AJUSTE', p_amount_cents, v_bal + p_amount_cents,
          'manual', null, p_motivo, v_admin);

  insert into notifications (user_id, tipo, titulo, cuerpo, url)
  values (p_user_id, 'AJUSTE',
          case when p_amount_cents > 0 then 'Saldo acreditado' else 'Ajuste de saldo' end,
          p_motivo, '/billetera');

  return v_bal + p_amount_cents;
end $$;

-- ─────────────────────────────── RECLAMOS ───────────────────────────────────

create or replace function fn_reclamo_crear(p_pin_code_id bigint, p_motivo text, p_descripcion text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_item bigint; v_id bigint;
begin
  if v_user is null then raise exception 'NO_AUTH'; end if;

  -- El pin debe ser de una orden del propio usuario.
  select pc.order_item_id into v_item
    from pin_codes pc
    join order_items oi on oi.id = pc.order_item_id
    join orders o       on o.id = oi.order_id
   where pc.id = p_pin_code_id and o.user_id = v_user and pc.estado = 'VENDIDO';
  if not found then raise exception 'PIN_NO_VALIDO'; end if;

  insert into claims (order_item_id, pin_code_id, user_id, motivo, descripcion)
  values (v_item, p_pin_code_id, v_user, p_motivo, p_descripcion)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'RECLAMO_DUPLICADO';
end $$;

create or replace function fn_reclamo_resolver(p_id bigint, p_aprobar boolean, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid(); c record; v_precio bigint; v_bal bigint;
begin
  if not is_admin() then raise exception 'SOLO_ADMIN'; end if;

  select * into c from claims where id = p_id for update;
  if not found            then raise exception 'NO_EXISTE'; end if;
  if c.estado <> 'ABIERTO' then raise exception 'YA_RESUELTO'; end if;

  if not p_aprobar then
    update claims set estado = 'RECHAZADO', nota_admin = p_nota,
                      resuelto_por = v_admin, resuelto_at = now()
     where id = p_id;
    insert into notifications (user_id, tipo, titulo, cuerpo, url)
    values (c.user_id, 'RECLAMO', 'Reclamo rechazado', p_nota, '/mis-compras');
    return;
  end if;

  select precio_unit_cents into v_precio from order_items where id = c.order_item_id;

  select balance_cents into v_bal from wallets where user_id = c.user_id for update;

  update wallets set balance_cents = balance_cents + v_precio, updated_at = now()
   where user_id = c.user_id;

  insert into wallet_ledger (user_id, tipo, amount_cents, balance_after_cents,
                             ref_type, ref_id, descripcion, created_by)
  values (c.user_id, 'REEMBOLSO', v_precio, v_bal + v_precio,
          'claim', p_id::text, coalesce(p_nota, 'Reembolso por pin defectuoso'), v_admin);

  update pin_codes set estado = 'DEFECTUOSO' where id = c.pin_code_id;

  update claims set estado = 'APROBADO', monto_reembolsado_cents = v_precio,
                    nota_admin = p_nota, resuelto_por = v_admin, resuelto_at = now()
   where id = p_id;

  update orders set estado = 'REEMBOLSADA_PARCIAL'
   where id = (select order_id from order_items where id = c.order_item_id);

  insert into notifications (user_id, tipo, titulo, cuerpo, url)
  values (c.user_id, 'RECLAMO', 'Reclamo aprobado',
          'Se devolvieron $' || to_char(v_precio / 100.0, 'FM999990.00') || ' a tu billetera.',
          '/billetera');
end $$;

-- ──────────────────────── CARGA MASIVA DE PINES ─────────────────────────────
-- Ignora silenciosamente los códigos que ya existían y reporta cuántos eran.

create or replace function fn_cargar_codigos(p_product_id uuid, p_codigos text[])
returns table (insertados int, duplicados int)
language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid(); v_batch uuid; v_ins int; v_total int;
begin
  if not is_admin() then raise exception 'SOLO_ADMIN'; end if;
  if not exists (select 1 from products where id = p_product_id) then
    raise exception 'PRODUCTO_NO_EXISTE';
  end if;

  select count(distinct upper(btrim(c)))::int into v_total
    from unnest(p_codigos) c where btrim(c) <> '';
  if v_total = 0 then raise exception 'SIN_CODIGOS'; end if;

  insert into code_batches (product_id, cargado_por, cantidad)
  values (p_product_id, v_admin, v_total) returning id into v_batch;

  with limpios as (
    select distinct on (upper(btrim(c))) btrim(c) as codigo
      from unnest(p_codigos) c where btrim(c) <> ''
  ),
  ins as (
    insert into pin_codes (product_id, codigo, batch_id)
    select p_product_id, codigo, v_batch from limpios
    on conflict do nothing
    returning 1
  )
  select count(*)::int into v_ins from ins;

  update code_batches set cantidad = v_ins, duplicados = v_total - v_ins where id = v_batch;

  insertados := v_ins;
  duplicados := v_total - v_ins;
  return next;
end $$;

-- ────────────────────── AUDITORÍA: ¿cuadra la caja? ─────────────────────────
-- Compara el balance cacheado contra la suma del libro mayor. Debe salir vacío.

create or replace function fn_auditoria_saldos()
returns table (user_id uuid, email text, balance_cents bigint, ledger_cents bigint, diferencia bigint)
language sql security definer set search_path = public as $$
  select w.user_id, p.email, w.balance_cents,
         coalesce(l.suma, 0) as ledger_cents,
         w.balance_cents - coalesce(l.suma, 0) as diferencia
    from wallets w
    join profiles p on p.id = w.user_id
    left join (select wl.user_id, sum(wl.amount_cents) as suma
                 from wallet_ledger wl group by wl.user_id) l on l.user_id = w.user_id
   where is_admin() and w.balance_cents <> coalesce(l.suma, 0);
$$;

-- ───────────────────────── MÉTRICAS DEL PANEL ───────────────────────────────

create or replace function fn_admin_metricas()
returns jsonb language sql security definer set search_path = public as $$
  select case when not is_admin() then '{}'::jsonb else jsonb_build_object(
    'ventas_hoy_cents',      (select coalesce(sum(total_cents),0) from orders
                               where created_at >= date_trunc('day', now() at time zone 'America/Guayaquil')),
    'ventas_mes_cents',      (select coalesce(sum(total_cents),0) from orders
                               where created_at >= date_trunc('month', now() at time zone 'America/Guayaquil')),
    'ordenes_hoy',           (select count(*) from orders
                               where created_at >= date_trunc('day', now() at time zone 'America/Guayaquil')),
    'recargas_pendientes',   (select count(*) from topup_requests where estado = 'PENDIENTE'),
    'reclamos_abiertos',     (select count(*) from claims where estado = 'ABIERTO'),
    'usuarios_total',        (select count(*) from profiles),
    'saldo_en_circulacion',  (select coalesce(sum(balance_cents),0) from wallets),
    'stock_total',           (select coalesce(sum(stock_disponible),0) from products where activo),
    'stock_bajo',            (select coalesce(jsonb_agg(jsonb_build_object(
                                 'nombre', nombre, 'stock', stock_disponible) order by stock_disponible), '[]'::jsonb)
                               from products where activo and stock_disponible <= 5)
  ) end;
$$;

-- Los visitantes sin sesión no pueden invocar ninguna función de negocio.
-- Las de administración además comprueban is_admin() en su primera línea:
-- un cliente autenticado que las llame recibe SOLO_ADMIN y no toca nada.
revoke all on function fn_checkout(text)                          from anon;
revoke all on function fn_cart_set(uuid, int)                     from anon;
revoke all on function fn_reclamo_crear(bigint, text, text)       from anon;
revoke all on function fn_topup_aprobar(bigint, text)             from anon;
revoke all on function fn_topup_rechazar(bigint, text)            from anon;
revoke all on function fn_ajustar_saldo(uuid, bigint, text)       from anon;
revoke all on function fn_reclamo_resolver(bigint, boolean, text) from anon;
revoke all on function fn_cargar_codigos(uuid, text[])            from anon;
revoke all on function fn_auditoria_saldos()                      from anon;
revoke all on function fn_admin_metricas()                        from anon;
