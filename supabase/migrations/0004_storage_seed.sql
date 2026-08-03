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
