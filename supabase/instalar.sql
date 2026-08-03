-- ============================================================================
-- PinStore FF — Esquema inicial completo
-- Billetera con libro mayor inmutable + inventario de pines + checkout ACID
-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────── ENUMS ──────────────────────────────────────
do $$ begin
  create type user_role    as enum ('CLIENTE','ADMIN');
  create type ledger_type  as enum ('RECARGA','COMPRA','REEMBOLSO','AJUSTE');
  create type topup_status as enum ('PENDIENTE','APROBADA','RECHAZADA');
  create type code_status  as enum ('DISPONIBLE','VENDIDO','DEFECTUOSO');
  create type order_status as enum ('COMPLETADA','REEMBOLSADA_PARCIAL','REEMBOLSADA');
  create type claim_status as enum ('ABIERTO','APROBADO','RECHAZADO');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────── TABLAS ─────────────────────────────────────

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null check (char_length(btrim(nombre)) between 3 and 80),
  telefono   text not null check (telefono ~ '^\+?[0-9]{9,15}$'),
  email      text not null,
  rol        user_role not null default 'CLIENTE',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profiles_rol_idx on profiles(rol) where rol = 'ADMIN';

-- Balance cacheado. La barrera final contra el descuadre es el CHECK >= 0.
create table if not exists wallets (
  user_id       uuid primary key references profiles(id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  updated_at    timestamptz not null default now()
);

-- Libro mayor: append-only. Ningún UPDATE ni DELETE, jamás (ver trigger abajo).
create table if not exists wallet_ledger (
  id                  bigserial primary key,
  user_id             uuid not null references profiles(id) on delete cascade,
  tipo                ledger_type not null,
  amount_cents        bigint not null check (amount_cents <> 0),
  balance_after_cents bigint not null check (balance_after_cents >= 0),
  ref_type            text,
  ref_id              text,
  descripcion         text,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now()
);
create index if not exists ledger_user_idx on wallet_ledger(user_id, id desc);

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  nombre           text not null,
  diamantes        integer not null check (diamantes > 0),
  precio_cents     bigint not null check (precio_cents > 0),
  descripcion      text,
  activo           boolean not null default true,
  orden            integer not null default 0,
  stock_disponible integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists products_activo_idx on products(activo, orden);

create table if not exists code_batches (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete restrict,
  cargado_por  uuid references profiles(id),
  cantidad     integer not null,
  duplicados   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists orders (
  id                bigserial primary key,
  numero            text unique not null,
  user_id           uuid not null references profiles(id) on delete restrict,
  total_cents       bigint not null check (total_cents > 0),
  estado            order_status not null default 'COMPLETADA',
  client_request_id text not null,
  created_at        timestamptz not null default now(),
  unique (user_id, client_request_id)
);
create index if not exists orders_user_idx on orders(user_id, id desc);
create index if not exists orders_fecha_idx on orders(created_at desc);

create table if not exists order_items (
  id                bigserial primary key,
  order_id          bigint not null references orders(id) on delete cascade,
  product_id        uuid not null references products(id) on delete restrict,
  producto_nombre   text not null,
  cantidad          integer not null check (cantidad > 0),
  precio_unit_cents bigint not null check (precio_unit_cents > 0),
  subtotal_cents    bigint not null check (subtotal_cents > 0)
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists pin_codes (
  id            bigserial primary key,
  product_id    uuid not null references products(id) on delete restrict,
  codigo        text not null,
  estado        code_status not null default 'DISPONIBLE',
  order_item_id bigint references order_items(id) on delete set null,
  batch_id      uuid references code_batches(id) on delete set null,
  created_at    timestamptz not null default now(),
  sold_at       timestamptz
);
-- Un mismo pin no puede existir dos veces, sin importar mayúsculas.
create unique index if not exists pin_codes_codigo_uq on pin_codes(upper(codigo));
-- Índice parcial: el checkout solo escanea los códigos libres de ese producto.
create index if not exists pin_codes_libres_idx on pin_codes(product_id, id) where estado = 'DISPONIBLE';
create index if not exists pin_codes_item_idx on pin_codes(order_item_id) where order_item_id is not null;

create table if not exists cart_items (
  user_id    uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  cantidad   integer not null check (cantidad between 1 and 50),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists bank_accounts (
  id              serial primary key,
  banco           text not null,
  tipo_cuenta     text not null,
  numero_cuenta   text not null,
  titular         text not null,
  identificacion  text not null,
  email_contacto  text,
  activo          boolean not null default true,
  orden           integer not null default 0
);

create table if not exists topup_requests (
  id                  bigserial primary key,
  user_id             uuid not null references profiles(id) on delete cascade,
  amount_cents        bigint not null check (amount_cents >= 500),
  banco               text not null,
  numero_referencia   text not null check (char_length(btrim(numero_referencia)) between 3 and 60),
  fecha_transferencia date not null,
  comprobante_path    text not null,
  estado              topup_status not null default 'PENDIENTE',
  nota_usuario        text,
  nota_admin          text,
  revisado_por        uuid references profiles(id),
  revisado_at         timestamptz,
  created_at          timestamptz not null default now()
);
-- Un mismo comprobante no se puede reclamar dos veces.
create unique index if not exists topup_ref_uq on topup_requests(banco, upper(btrim(numero_referencia)));
create index if not exists topup_pendientes_idx on topup_requests(created_at) where estado = 'PENDIENTE';
create index if not exists topup_user_idx on topup_requests(user_id, id desc);

create table if not exists claims (
  id                      bigserial primary key,
  order_item_id           bigint not null references order_items(id) on delete cascade,
  pin_code_id             bigint references pin_codes(id) on delete set null,
  user_id                 uuid not null references profiles(id) on delete cascade,
  motivo                  text not null,
  descripcion             text,
  estado                  claim_status not null default 'ABIERTO',
  monto_reembolsado_cents bigint not null default 0,
  nota_admin              text,
  resuelto_por            uuid references profiles(id),
  resuelto_at             timestamptz,
  created_at              timestamptz not null default now()
);
-- Un pin solo puede reclamarse una vez.
create unique index if not exists claims_pin_uq on claims(pin_code_id) where pin_code_id is not null;
create index if not exists claims_abiertos_idx on claims(created_at) where estado = 'ABIERTO';

create table if not exists notifications (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  tipo       text not null,
  titulo     text not null,
  cuerpo     text,
  url        text,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on notifications(user_id, id desc);

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create sequence if not exists order_number_seq;

-- ────────────────────────── TRIGGERS DE INTEGRIDAD ──────────────────────────

-- 1. El libro mayor es inmutable. Ni el service_role puede alterarlo.
create or replace function trg_ledger_inmutable() returns trigger
language plpgsql as $$
begin
  raise exception 'El libro mayor es inmutable: no se permite % sobre wallet_ledger', TG_OP;
end $$;

drop trigger if exists ledger_no_update on wallet_ledger;
create trigger ledger_no_update before update or delete on wallet_ledger
  for each row execute function trg_ledger_inmutable();

-- 2. Nadie se autopromueve a ADMIN editando su propio perfil.
--    La excepción es cuando auth.uid() es NULL: ese contexto solo ocurre desde
--    el SQL Editor o el service_role, que ya tienen control total de la base.
--    Sin esa excepción sería imposible crear el primer administrador.
create or replace function trg_profiles_protege_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol
     and auth.uid() is not null
     and not exists (select 1 from profiles where id = auth.uid() and rol = 'ADMIN') then
    new.rol := old.rol;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protege_rol on profiles;
create trigger profiles_protege_rol before update on profiles
  for each row execute function trg_profiles_protege_rol();

-- 3. Contador de stock. A nivel de STATEMENT (no de fila) para que una compra
--    de 50 códigos haga un solo UPDATE sobre products y no cincuenta.
--    Ojo: el contador es para mostrar en pantalla. La verdad sobre el stock la
--    impone el SKIP LOCKED del checkout, no esta columna.
create or replace function trg_sync_stock() returns trigger
language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update products p set stock_disponible = greatest(0, p.stock_disponible + agg.d)
      from (select product_id, count(*)::int as d from nuevas
             where estado = 'DISPONIBLE' group by product_id) agg
     where p.id = agg.product_id;

  elsif TG_OP = 'DELETE' then
    update products p set stock_disponible = greatest(0, p.stock_disponible - agg.d)
      from (select product_id, count(*)::int as d from viejas
             where estado = 'DISPONIBLE' group by product_id) agg
     where p.id = agg.product_id;

  else
    update products p set stock_disponible = greatest(0, p.stock_disponible + agg.d)
      from (
        select product_id, sum(d)::int as d from (
          select product_id,  1 as d from nuevas where estado = 'DISPONIBLE'
          union all
          select product_id, -1 as d from viejas where estado = 'DISPONIBLE'
        ) x group by product_id
      ) agg
     where p.id = agg.product_id and agg.d <> 0;
  end if;
  return null;
end $$;

drop trigger if exists stock_ins on pin_codes;
create trigger stock_ins after insert on pin_codes
  referencing new table as nuevas
  for each statement execute function trg_sync_stock();

drop trigger if exists stock_upd on pin_codes;
create trigger stock_upd after update on pin_codes
  referencing new table as nuevas old table as viejas
  for each statement execute function trg_sync_stock();

drop trigger if exists stock_del on pin_codes;
create trigger stock_del after delete on pin_codes
  referencing old table as viejas
  for each statement execute function trg_sync_stock();

-- ───────────────────── ALTA AUTOMÁTICA DE PERFIL Y BILLETERA ────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, telefono, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'nombre'), ''), 'Usuario'),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'telefono'), ''), '0000000000'),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
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
-- ============================================================================
-- PinStore FF — Row Level Security
-- Regla base: si no hay una policy que lo permita explícitamente, está prohibido.
-- Ninguna tabla de dinero acepta escrituras directas: solo las funciones.
-- ============================================================================

alter table profiles       enable row level security;
alter table wallets        enable row level security;
alter table wallet_ledger  enable row level security;
alter table products       enable row level security;
alter table pin_codes      enable row level security;
alter table code_batches   enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table cart_items     enable row level security;
alter table topup_requests enable row level security;
alter table claims         enable row level security;
alter table notifications  enable row level security;
alter table bank_accounts  enable row level security;
alter table app_settings   enable row level security;

-- ── PERFILES ────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());   -- el rol lo blinda un trigger

-- ── BILLETERA ───────────────────────────────────────────────────────────────
-- Solo lectura. Cero políticas de INSERT/UPDATE/DELETE: el saldo únicamente
-- se mueve dentro de las funciones SECURITY DEFINER.
drop policy if exists wallets_select on wallets;
create policy wallets_select on wallets for select to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists ledger_select on wallet_ledger;
create policy ledger_select on wallet_ledger for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- ── CATÁLOGO ────────────────────────────────────────────────────────────────
-- El catálogo es público: se ve sin iniciar sesión.
drop policy if exists products_select on products;
create policy products_select on products for select to anon, authenticated
  using (activo or is_admin());

drop policy if exists products_admin on products;
create policy products_admin on products for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── PINES ───────────────────────────────────────────────────────────────────
-- Un cliente solo ve los códigos VENDIDOS que pertenecen a sus propias órdenes.
-- El inventario disponible es invisible para todo el mundo salvo el admin.
drop policy if exists pin_codes_select on pin_codes;
create policy pin_codes_select on pin_codes for select to authenticated
  using (
    is_admin()
    or (estado in ('VENDIDO','DEFECTUOSO') and exists (
          select 1 from order_items oi join orders o on o.id = oi.order_id
           where oi.id = pin_codes.order_item_id and o.user_id = auth.uid()))
  );

drop policy if exists pin_codes_admin on pin_codes;
create policy pin_codes_admin on pin_codes for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists batches_admin on code_batches;
create policy batches_admin on code_batches for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── ÓRDENES ─────────────────────────────────────────────────────────────────
drop policy if exists orders_select on orders;
create policy orders_select on orders for select to authenticated
  using (user_id = auth.uid() or is_admin());

drop policy if exists order_items_select on order_items;
create policy order_items_select on order_items for select to authenticated
  using (is_admin() or exists (
    select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid()));

-- ── CARRITO ─────────────────────────────────────────────────────────────────
drop policy if exists cart_own on cart_items;
create policy cart_own on cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── RECARGAS ────────────────────────────────────────────────────────────────
drop policy if exists topup_select on topup_requests;
create policy topup_select on topup_requests for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- El usuario crea su solicitud, siempre en estado PENDIENTE y a su propio nombre.
-- Tope de 3 solicitudes pendientes: frena el spam de comprobantes falsos.
drop policy if exists topup_insert on topup_requests;
create policy topup_insert on topup_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and estado = 'PENDIENTE'
    and revisado_por is null
    and (select count(*) from topup_requests t
          where t.user_id = auth.uid() and t.estado = 'PENDIENTE') < 3
  );
-- Sin policy de UPDATE: aprobar/rechazar pasa obligatoriamente por las funciones.

-- ── RECLAMOS ────────────────────────────────────────────────────────────────
drop policy if exists claims_select on claims;
create policy claims_select on claims for select to authenticated
  using (user_id = auth.uid() or is_admin());

-- ── NOTIFICACIONES ──────────────────────────────────────────────────────────
drop policy if exists notif_select on notifications;
create policy notif_select on notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notif_update on notifications;
create policy notif_update on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── DATOS BANCARIOS Y AJUSTES ───────────────────────────────────────────────
drop policy if exists bancos_select on bank_accounts;
create policy bancos_select on bank_accounts for select to authenticated
  using (activo or is_admin());

drop policy if exists bancos_admin on bank_accounts;
create policy bancos_admin on bank_accounts for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists settings_select on app_settings;
create policy settings_select on app_settings for select to anon, authenticated using (true);

drop policy if exists settings_admin on app_settings;
create policy settings_admin on app_settings for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── REALTIME ────────────────────────────────────────────────────────────────
-- Stock, saldo y avisos en vivo. Realtime respeta las policies de arriba.
do $$ begin
  alter publication supabase_realtime add table products;      exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table wallets;       exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table notifications; exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table topup_requests; exception when others then null; end $$;
-- ============================================================================
-- PinStore FF — Storage de comprobantes + datos iniciales
-- ============================================================================

-- ── BUCKET PRIVADO DE COMPROBANTES ──────────────────────────────────────────
-- Privado: las imágenes solo se sirven con URL firmada de corta duración.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario escribe únicamente dentro de su carpeta: comprobantes/<uid>/...
drop policy if exists comprobantes_insert on storage.objects;
create policy comprobantes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists comprobantes_select on storage.objects;
create policy comprobantes_select on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes'
         and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- Nadie borra ni sobrescribe un comprobante ya subido: es evidencia contable.

-- ── CATÁLOGO ────────────────────────────────────────────────────────────────
insert into products (slug, nombre, diamantes, precio_cents, orden, descripcion) values
  ('110-diamantes',  '110 Diamantes',   110,   150, 1, 'Pin de 110 diamantes para Free Fire'),
  ('341-diamantes',  '341 Diamantes',   341,   350, 2, 'Pin de 341 diamantes para Free Fire'),
  ('572-diamantes',  '572 Diamantes',   572,   550, 3, 'Pin de 572 diamantes para Free Fire'),
  ('1166-diamantes', '1166 Diamantes', 1166,   970, 4, 'Pin de 1166 diamantes para Free Fire'),
  ('2398-diamantes', '2398 Diamantes', 2398,  2050, 5, 'Pin de 2398 diamantes para Free Fire'),
  ('6160-diamantes', '6160 Diamantes', 6160,  5300, 6, 'Pin de 6160 diamantes para Free Fire')
on conflict (slug) do update
  set nombre = excluded.nombre,
      diamantes = excluded.diamantes,
      precio_cents = excluded.precio_cents,
      orden = excluded.orden;

-- ── CUENTAS BANCARIAS ───────────────────────────────────────────────────────
insert into bank_accounts (id, banco, tipo_cuenta, numero_cuenta, titular, identificacion, email_contacto, orden) values
  (1, 'Banco Guayaquil', 'Ahorros',              '0024419555', 'Avilez Cevallos Luis Fernando', '1208276111', 'luisavilez333@gmail.com', 1),
  (2, 'Banco Pichincha', 'Ahorro Transaccional', '2210925922', 'Avilez Cevallos Luis Fernando', '1208276111', 'luisavilez333@gmail.com', 2)
on conflict (id) do update
  set banco = excluded.banco, tipo_cuenta = excluded.tipo_cuenta,
      numero_cuenta = excluded.numero_cuenta, titular = excluded.titular,
      identificacion = excluded.identificacion, email_contacto = excluded.email_contacto;
select setval(pg_get_serial_sequence('bank_accounts','id'), (select max(id) from bank_accounts));

-- ── AJUSTES ─────────────────────────────────────────────────────────────────
insert into app_settings (key, value) values
  ('tienda',  '{"nombre":"PinStore FF","moneda":"USD","zona":"America/Guayaquil"}'::jsonb),
  ('recarga', '{"minimo_cents":500,"max_pendientes":3}'::jsonb),
  ('canje',   '{"url":"https://reward.ff.garena.com/","instrucciones":"Ingresa a la página oficial de recompensas de Garena, inicia sesión con tu cuenta de Free Fire y canjea el código."}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
