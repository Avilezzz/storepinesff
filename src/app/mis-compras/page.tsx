import Link from 'next/link'
import { Package, ChevronRight, Gem } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MisCompras() {
  type Orden = {
    id: number; numero: string; total_cents: number; estado: string; created_at: string
    order_items: { cantidad: number; producto_nombre: string }[]
  }

  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('orders')
    .select('id, numero, total_cents, estado, created_at, order_items(cantidad, producto_nombre)')
    .order('id', { ascending: false })
    .limit(50)

  if (error) console.error('[mis-compras]', error)
  const ordenes = data as unknown as Orden[] | null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
      <h1 className="titulo mb-5">Mis compras</h1>

      {!ordenes?.length ? (
        <div className="tarjeta flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Package size={26} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Todavía no has comprado nada</p>
          <Link href="/" className="btn btn-primario mt-1">Ver los pines</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ordenes.map((o) => (
            <Link key={o.id} href={`/mis-compras/${o.id}`}
              className="tarjeta flex items-center gap-3 p-3.5 transition hover:border-marca/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-panel2 text-marca">
                <Gem size={17} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="cifra text-sm font-medium">{o.numero}</p>
                  {o.estado !== 'COMPLETADA' && (
                    <span className="chip bg-alerta/12 text-alerta">Con reembolso</span>
                  )}
                </div>
                <p className="truncate text-xs text-tenue">
                  {o.order_items.map((i) => `${i.cantidad}× ${i.producto_nombre}`).join(' · ')}
                </p>
                <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(o.created_at)}</p>
              </div>

              <p className="cifra text-sm font-semibold">{usd(o.total_cents)}</p>
              <ChevronRight size={16} className="shrink-0 text-tenue" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
