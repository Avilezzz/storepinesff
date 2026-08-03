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
