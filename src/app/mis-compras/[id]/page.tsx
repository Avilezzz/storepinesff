import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle, Gamepad2, User } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'

export const dynamic = 'force-dynamic'

export default async function DetalleOrden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await supabaseServer()

  type Orden = {
    id: number; numero: string; total_cents: number; estado: string; created_at: string
    id_jugador: string | null; nombre_jugador: string | null
    order_items: {
      id: number; producto_nombre: string; cantidad: number
      precio_unit_cents: number; subtotal_cents: number
      products: { imagen_url: string | null } | null
    }[]
  }

  type Redemption = {
    id: number; estado: string; nombre_jugador: string | null
    mensaje_error: string | null; duracion_ms: number | null; created_at: string
  }

  const { data: { user } } = await sb.auth.getUser()

  const { data } = await sb
    .from('orders')
    .select('id, numero, total_cents, estado, created_at, id_jugador, nombre_jugador, order_items(id, producto_nombre, cantidad, precio_unit_cents, subtotal_cents, products(imagen_url))')
    .eq('id', id)
    .eq('user_id', user!.id)
    .maybeSingle()

  const orden = data as unknown as Orden | null
  if (!orden) notFound()

  // Historial de canjes
  const { data: canjesRaw } = await sb
    .from('redemptions')
    .select('id, estado, nombre_jugador, mensaje_error, duracion_ms, created_at')
    .eq('order_id', orden.id)
    .order('created_at', { ascending: false })

  const canjes = (canjesRaw ?? []) as Redemption[]

  const estadoConfig: Record<string, { icono: typeof CheckCircle2; color: string; texto: string }> = {
    COMPLETADA: { icono: CheckCircle2, color: 'text-ok', texto: 'Recarga completada' },
    PAGADA: { icono: Clock, color: 'text-alerta', texto: 'Pendiente de recarga' },
    PROCESANDO: { icono: Clock, color: 'text-marca', texto: 'Procesando recarga' },
    ERROR: { icono: XCircle, color: 'text-error', texto: 'Error en la recarga' },
    REEMBOLSADA: { icono: AlertTriangle, color: 'text-tenue', texto: 'Reembolsada' },
    REEMBOLSADA_PARCIAL: { icono: AlertTriangle, color: 'text-alerta', texto: 'Reembolso parcial' },
  }

  const cfg = estadoConfig[orden.estado] ?? estadoConfig.PAGADA
  const Icono = cfg.icono

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
      <Link href="/mis-compras" className="enlace">
        <ArrowLeft size={14} /> Mis compras
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="cifra titulo">{orden.numero}</h1>
          <p className="mt-0.5 text-xs text-tenue">{fecha(orden.created_at)}</p>
        </div>
        <p className="cifra text-xl font-semibold text-marca">{usd(orden.total_cents)}</p>
      </div>

      {/* Estado de la recarga */}
      <div className={`tarjeta mt-4 flex items-center gap-3 p-4 ${
        orden.estado === 'COMPLETADA' ? 'border-ok/40' :
        orden.estado === 'ERROR' ? 'border-error/40' : ''}`}>
        <Icono size={22} className={cfg.color} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.texto}</p>
          {orden.nombre_jugador && (
            <p className="mt-0.5 text-xs text-tenue">
              Jugador: <span className="font-medium text-fuerte">{orden.nombre_jugador}</span>
            </p>
          )}
        </div>
      </div>

      {/* Datos del jugador */}
      {(orden.id_jugador || orden.nombre_jugador) && (
        <div className="tarjeta mt-3 divide-y divide-linea">
          {orden.nombre_jugador && (
            <div className="flex items-center gap-3 p-3.5 text-sm">
              <User size={16} className="text-marca" />
              <span className="text-tenue">Jugador</span>
              <span className="ml-auto font-semibold">{orden.nombre_jugador}</span>
            </div>
          )}
          {orden.id_jugador && (
            <div className="flex items-center gap-3 p-3.5 text-sm">
              <Gamepad2 size={16} className="text-marca" />
              <span className="text-tenue">ID</span>
              <span className="cifra ml-auto font-medium">{orden.id_jugador}</span>
            </div>
          )}
        </div>
      )}

      {/* Productos */}
      <div className="tarjeta mt-4 divide-y divide-linea">
        {orden.order_items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
            <ImagenProducto url={i.products?.imagen_url} alt={i.producto_nombre}
              sizes="48px" iconoSize={15} className="h-12 w-9.5 shrink-0 rounded-md" />
            <span className="min-w-0 flex-1 truncate">
              <span className="cifra font-medium">{i.cantidad}×</span> {i.producto_nombre}
            </span>
            <span className="cifra shrink-0 text-xs text-tenue">{usd(i.precio_unit_cents)} c/u</span>
            <span className="cifra shrink-0 font-medium">{usd(i.subtotal_cents)}</span>
          </div>
        ))}
      </div>

      {/* Mensaje para órdenes pendientes */}
      {orden.estado === 'PAGADA' && (
        <div className="tarjeta mt-5 p-4">
          <p className="subtitulo">Completa tu recarga</p>
          <p className="mt-2 text-sm text-tenue">
            Tu pago fue confirmado. Regresa a la tienda y selecciona este producto
            para ingresar tu ID de Free Fire y recibir los diamantes.
          </p>
        </div>
      )}

      {/* Mensaje para errores */}
      {orden.estado === 'ERROR' && (
        <div className="tarjeta mt-5 border-error/30 p-4">
          <p className="subtitulo text-error">Hubo un problema</p>
          <p className="mt-2 text-sm text-tenue">
            No se pudo completar la recarga automática. Puedes intentar de nuevo
            desde la tienda o contactar soporte.
          </p>
          {canjes[0]?.mensaje_error && (
            <p className="mt-2 rounded-lg bg-error/8 px-3 py-2 text-xs text-error">
              {canjes[0].mensaje_error}
            </p>
          )}
        </div>
      )}

      {/* Historial de canjes (solo si hay intentos) */}
      {canjes.length > 0 && (
        <>
          <h2 className="subtitulo mb-3 mt-7">Historial de operaciones</h2>
          <div className="space-y-2">
            {canjes.map((c) => {
              const exito = c.estado === 'EXITO'
              return (
                <div key={c.id} className="tarjeta p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {exito
                        ? <CheckCircle2 size={15} className="text-ok" />
                        : <XCircle size={15} className="text-error" />}
                      <span className={`text-sm font-medium ${exito ? 'text-ok' : 'text-error'}`}>
                        {exito ? 'Canje exitoso' : `Error: ${c.estado}`}
                      </span>
                    </div>
                    <span className="text-[11px] text-tenue">{fecha(c.created_at)}</span>
                  </div>
                  {c.nombre_jugador && (
                    <p className="mt-1.5 text-xs text-tenue">
                      Jugador: <span className="font-medium">{c.nombre_jugador}</span>
                    </p>
                  )}
                  {c.mensaje_error && !exito && (
                    <p className="mt-1.5 text-xs text-error/80">{c.mensaje_error}</p>
                  )}
                  {c.duracion_ms != null && (
                    <p className="mt-1 text-[11px] text-tenue">
                      Duración: {(c.duracion_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
