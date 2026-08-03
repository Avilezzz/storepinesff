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
