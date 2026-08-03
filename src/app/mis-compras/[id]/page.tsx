import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'
import PinesEntregados, { type Pin } from '@/components/PinesEntregados'

export const dynamic = 'force-dynamic'

export default async function DetalleOrden({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await supabaseServer()

  type Orden = {
    id: number; numero: string; total_cents: number; estado: string; created_at: string
    order_items: {
      id: number; producto_nombre: string; cantidad: number
      precio_unit_cents: number; subtotal_cents: number
    }[]
  }

  const { data } = await sb
    .from('orders')
    .select('id, numero, total_cents, estado, created_at, order_items(id, producto_nombre, cantidad, precio_unit_cents, subtotal_cents)')
    .eq('id', id)
    .maybeSingle()

  const orden = data as unknown as Orden | null
  if (!orden) notFound()

  const itemIds = orden.order_items.map((i) => i.id)

  // RLS garantiza que solo lleguen los pines de las órdenes de este usuario.
  const [{ data: pines }, { data: reclamosRaw }, { data: canje }] = await Promise.all([
    sb.from('pin_codes').select('id, codigo, estado, order_item_id').in('order_item_id', itemIds).order('id'),
    sb.from('claims').select('pin_code_id, estado').in('order_item_id', itemIds),
    sb.from('app_settings').select('value').eq('key', 'canje').maybeSingle(),
  ])

  const reclamos = reclamosRaw as { pin_code_id: number | null }[] | null
  const urlCanje = (canje?.value as { url?: string } | null)?.url ?? 'https://reward.ff.garena.com/'

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

      <div className="tarjeta mt-4 divide-y divide-linea">
        {orden.order_items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
            <span className="min-w-0 truncate">
              <span className="cifra font-medium">{i.cantidad}×</span> {i.producto_nombre}
            </span>
            <span className="cifra shrink-0 text-xs text-tenue">{usd(i.precio_unit_cents)} c/u</span>
            <span className="cifra shrink-0 font-medium">{usd(i.subtotal_cents)}</span>
          </div>
        ))}
      </div>

      <h2 className="subtitulo mb-3 mt-7">Tus pines</h2>
      <PinesEntregados
        pines={(pines as Pin[]) ?? []}
        reclamados={new Set((reclamos ?? []).map((r) => r.pin_code_id))}
      />

      <div className="tarjeta mt-5 p-4">
        <p className="subtitulo">Cómo canjear</p>
        <ol className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-tenue">
          <li className="flex gap-2.5"><span className="text-marca">1.</span> Entra al sitio oficial de recompensas de Garena.</li>
          <li className="flex gap-2.5"><span className="text-marca">2.</span> Inicia sesión con la misma cuenta de tu Free Fire.</li>
          <li className="flex gap-2.5"><span className="text-marca">3.</span> Pega el código y confirma. Los diamantes llegan a esa cuenta.</li>
        </ol>
        <a href={urlCanje} target="_blank" rel="noopener noreferrer" className="btn btn-suave mt-4 w-full sm:w-auto">
          Abrir sitio de canje <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
