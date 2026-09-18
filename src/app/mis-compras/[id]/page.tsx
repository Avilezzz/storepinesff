import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle, Gamepad2, User } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'
import PinesEntregados, { type Pin } from '@/components/PinesEntregados'

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
  if (!user) redirect('/login')

  const { data } = await sb
    .from('orders')
    .select('id, numero, total_cents, estado, created_at, id_jugador, nombre_jugador, order_items(id, producto_nombre, cantidad, precio_unit_cents, subtotal_cents, products(imagen_url))')
    .eq('id', id)
    .eq('user_id', user.id)
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
  if (!canjesRaw) throw new Error('No se pudo consultar el historial de la compra.')

  // Las órdenes automáticas conservan su historial, sin ofrecer de nuevo sus pines.
  const esManual = !orden.id_jugador && canjes.length === 0 && orden.estado !== 'PROCESANDO' && orden.estado !== 'ERROR'
  const itemIds = orden.order_items.map((item) => item.id)
  const [pinesResult, reclamosResult, configResult] = esManual && itemIds.length > 0
    ? await Promise.all([
        sb.from('pin_codes').select('id, codigo, estado, order_item_id')
          .in('order_item_id', itemIds).in('estado', ['VENDIDO', 'DEFECTUOSO']).order('id'),
        sb.from('claims').select('pin_code_id').in('order_item_id', itemIds),
        sb.from('app_settings').select('value').eq('key', 'canje').maybeSingle(),
      ])
    : [null, null, null]
  if (pinesResult?.error || reclamosResult?.error || configResult?.error) {
    throw new Error('No se pudieron cargar los pines. Actualiza la página; no vuelvas a pagar.')
  }
  const pines = (pinesResult?.data ?? []) as Pin[]
  const config = configResult?.data?.value as { url?: string; url_embed?: string } | undefined
  const urlExterna = config?.url || 'https://redeem.wik.do/'
  const urlEmbed = config?.url_embed || urlExterna

  const estadoConfig: Record<string, { icono: typeof CheckCircle2; color: string; texto: string }> = {
    COMPLETADA: { icono: CheckCircle2, color: 'text-ok', texto: esManual ? 'Compra completada · canje manual' : 'Recarga completada' },
    PAGADA: { icono: Clock, color: 'text-alerta', texto: pines.length > 0 ? 'Pines entregados · canje manual' : 'Compra pagada' },
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
      {esManual && pines.length > 0 && (
        <>
          <h2 className="subtitulo mb-3 mt-7">Tus pines</h2>
          <PinesEntregados pines={pines}
            reclamados={new Set((reclamosResult?.data ?? []).map((r) => r.pin_code_id))}
            urlEmbed={urlEmbed} urlExterna={urlExterna} />
        </>
      )}
      {(orden.estado === 'PAGADA' || (esManual && orden.estado === 'COMPLETADA')) && pines.length === 0 && (
        <div className="tarjeta mt-5 p-4">
          <p className="subtitulo">Tu compra ya está pagada</p>
          <p className="mt-2 text-sm text-tenue">
            No vuelvas a comprar este producto para completar esta orden.
            Contacta soporte con el número de compra para revisar la entrega.
          </p>
        </div>
      )}

      {/* Mensaje para errores */}
      {orden.estado === 'ERROR' && (
        <div className="tarjeta mt-5 border-error/30 p-4">
          <p className="subtitulo text-error">Hubo un problema</p>
          <p className="mt-2 text-sm text-tenue">
            No se pudo completar la recarga automática anterior. Contacta soporte
            con el número de compra. No vuelvas a pagar para resolver esta orden.
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
