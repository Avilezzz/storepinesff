# PinStore FF

Tienda de pines de diamantes para Free Fire. Billetera interna con recarga por
transferencia bancaria, inventario de códigos y entrega instantánea.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase · Bun
**UI:** lucide-react (iconos) · sonner (toasts) · componentes propios en `src/components/ui/`

---

## Puesta en marcha

### 1. Crear la base de datos

Abre el **SQL Editor** de tu proyecto en Supabase, pega el contenido de
[`supabase/instalar.sql`](supabase/instalar.sql) y ejecútalo. Crea todo de una vez:
tablas, índices, funciones, RLS, el bucket de comprobantes, el catálogo y tus cuentas bancarias.

> Los archivos numerados en `supabase/migrations/` son ese mismo SQL dividido por
> temas, por si prefieres aplicarlo por partes o versionarlo con la CLI.

### 2. Crear tu cuenta de administrador

Levanta la app, entra a `/registro` y crea tu cuenta normal. Después, en el SQL Editor:

```sql
update profiles set rol = 'ADMIN' where email = 'tu-correo@gmail.com';
```

Vuelve a cargar la página: te aparece **⚙️ Panel de administración** en el menú.
Es la única vez que necesitas tocar SQL a mano.

### 3. Variables de entorno

`.env.local` ya está configurado con la URL y la clave publicable del proyecto.
La app **no usa la clave secreta en ningún punto**: cada operación privilegiada
pasa por una función RPC que verifica `is_admin()` dentro de Postgres.

### 4. Correr

```bash
bun install
bun dev          # desarrollo en http://localhost:3000
bun run build    # build de producción
```

---

## Cómo se opera

| Tarea | Dónde |
|---|---|
| Cargar pines nuevos | `/admin/codigos` — pega un código por línea, los repetidos se ignoran |
| Aprobar una recarga | `/admin/recargas` — ves el comprobante y apruebas; el saldo se acredita solo |
| Cambiar un precio | `/admin/productos` — clic sobre el precio |
| Devolver un pin malo | `/admin/reclamos` — al aprobar, el dinero vuelve a la billetera del cliente |
| Corregir un saldo | `/admin/usuarios` — ajuste manual con motivo, queda en el libro mayor |
| Ver cómo va el negocio | `/admin` — ventas, saldo en circulación, stock bajo |

---

## Por qué la caja no se descuadra

1. **El dinero es un entero de centavos.** `$1.50` se guarda como `150`. Nunca
   hay decimales flotantes, así que no hay redondeos que se acumulen.

2. **`fn_checkout()` es una sola transacción.** Bloquea la billetera, recalcula
   el total desde la base (el precio que envía el navegador se ignora), reserva
   los códigos, debita y asienta el movimiento. Si algo falla en cualquier paso,
   se revierte todo.

3. **`FOR UPDATE SKIP LOCKED`** al reservar códigos: dos compradores simultáneos
   nunca se llevan el mismo pin, y ninguno espera al otro. Es lo que permite
   vender a mucha gente a la vez sin bloquear la tienda.

4. **`CHECK (balance_cents >= 0)`** en la tabla. Aunque toda la lógica de arriba
   fallara, Postgres se niega a dejar un saldo negativo.

5. **El libro mayor es inmutable.** Un trigger rechaza cualquier `UPDATE` o
   `DELETE` sobre `wallet_ledger`. Cada centavo tiene su asiento y su motivo.

6. **`fn_auditoria_saldos()`** compara el saldo guardado contra la suma del libro
   mayor. Si alguna vez no cuadran, aparece una alerta roja en `/admin`.

7. **Idempotencia en el checkout.** Cada compra lleva un identificador único: un
   doble clic o un reintento por mala conexión devuelve la orden ya creada en vez
   de cobrar dos veces.

---

## Interfaz

Pensada para el celular primero, que es de donde llega casi todo el tráfico.

- **Barra inferior fija en móvil** (`BarraMovil`): Tienda, Carrito, Compras, Saldo
  y Admin si corresponde. Queda donde alcanza el pulgar.
- **Iconos** de lucide-react, no emojis: se ven igual en Android, iPhone y Windows,
  heredan el color del texto y escalan sin verse pixelados.
- **Botones de acción secundaria sin fondo** (`.btn-icono`): solo el icono, el
  fondo aparece al pasar por encima o al enfocar con teclado.
- **Avatar con la inicial** al estilo Google (`ui/Avatar`): el color se deriva del
  nombre con un hash, así cada usuario mantiene siempre el mismo.
- **Toasts** con sonner en vez de mensajes incrustados. Las notificaciones que
  llegan por Realtime también se anuncian solas.
- **Diálogos propios** (`ui/Dialogo`) en lugar de `confirm()` y `prompt()`, que en
  móvil se ven como alertas del navegador. Suben desde abajo en pantallas pequeñas.
- **Skeletons** (`ui/Skeleton` + `loading.tsx`) con la misma geometría que el
  contenido real, para que la página no salte al llegar los datos.
- `font-size: 16px` en los campos de formulario: por debajo de eso, iOS hace zoom
  automático al enfocar y descuadra la pantalla.
- `env(safe-area-inset-bottom)` en la barra inferior y los diálogos, para no
  quedar debajo del indicador de inicio del iPhone.

---

## Notas de rendimiento

- El catálogo (`/`) es **estático con ISR de 60 s**: se sirve desde la CDN, no
  golpea la base. El stock exacto llega aparte por Realtime al cargar la página.
- Índice parcial sobre los pines libres: el checkout solo recorre los códigos
  disponibles de ese producto, no toda la tabla.
- El contador de stock se actualiza a nivel de *statement*, no de fila: comprar
  50 pines hace un `UPDATE` sobre `products`, no cincuenta.
- Saldo, stock y avisos se propagan por Supabase Realtime; no hay polling.

---

## Pendientes conocidos

- `src/middleware.ts` usa la convención `middleware`, que Next 16 marca como
  obsoleta en favor de `proxy`. Funciona, pero conviene migrarlo.
- Los tipos de TypeScript del cliente Supabase están anotados a mano. Una vez
  aplicado el esquema conviene generarlos:
  `bunx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`
- Verificación de correo desactivada: el usuario puede comprar apenas se registra.
