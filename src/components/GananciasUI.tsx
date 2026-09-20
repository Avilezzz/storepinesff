'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Package, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { aCentavos, fecha, mensajeError, usd } from '@/lib/format'

export type PrecioRevendedor = { id: string; nombre: string; imagen_url: string | null; precio_cents: number; pvp_sugerido_cents: number; pvp_cents: number }
export type VentaRevendedor = { id: number; tipo: string; cost_cents: number; sale_price_cents: number; profit_cents: number; created_at: string; products: { nombre: string } | null }

export default function GananciasUI({ productos, ventas, pendientes }: { productos: PrecioRevendedor[]; ventas: VentaRevendedor[]; pendientes: number }) {
  const total = ventas.reduce((s, v) => s + v.profit_cents, 0)
  const vendido = ventas.reduce((s, v) => s + v.sale_price_cents, 0)
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:py-9">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="titulo">Mis ganancias</h1><p className="mt-1 text-sm text-tenue">Configura tus precios y registra cada pin que vendas.</p></div>
      {pendientes > 0 && <Link href="/mis-compras" className="btn btn-primario"><Package size={15} />{pendientes} pin{pendientes === 1 ? '' : 'es'} por registrar</Link>}</header>
    <div className="mt-5 grid grid-cols-3 gap-2"><Kpi nombre="Ganancia" valor={usd(total)} color /><Kpi nombre="Ventas" valor={usd(vendido)} /><Kpi nombre="Pines" valor={String(ventas.length)} /></div>
    <h2 className="subtitulo mb-3 mt-7">Tus precios de venta</h2>
    <div className="grid gap-3 sm:grid-cols-2">{productos.map(p => <EditorPrecio key={p.id} producto={p} />)}</div>
    <h2 className="subtitulo mb-3 mt-7">Movimientos de ganancia</h2>
    {ventas.length ? <div className="tarjeta divide-y divide-linea">{ventas.map(v => <div key={v.id} className="flex items-center gap-3 p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ok/12 text-ok"><TrendingUp size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{v.products?.nombre ?? 'Producto'} · {v.tipo === 'CANJE' ? 'Canje' : 'Venta'}</p><p className="text-xs text-tenue">Venta {usd(v.sale_price_cents)} · costo {usd(v.cost_cents)} · {fecha(v.created_at)}</p></div><p className="cifra font-semibold text-ok">+{usd(v.profit_cents)}</p></div>)}</div>
      : <div className="tarjeta px-5 py-10 text-center text-sm text-tenue">Aún no registras ventas. Entra a una compra y toca “Registrar venta” en el pin entregado.</div>}
  </div>
}

function Kpi({ nombre, valor, color = false }: { nombre: string; valor: string; color?: boolean }) { return <div className="tarjeta px-3 py-3.5"><p className="text-xs text-tenue">{nombre}</p><p className={`cifra mt-1 text-lg font-semibold ${color ? 'text-ok' : ''}`}>{valor}</p></div> }

function EditorPrecio({ producto: p }: { producto: PrecioRevendedor }) {
  const [valor, setValor] = useState((p.pvp_cents / 100).toFixed(2)); const [guardando, setGuardando] = useState(false)
  const cents = aCentavos(valor); const ganancia = cents === null ? null : cents - p.precio_cents
  async function guardar() { if (cents === null || cents <= 0) return toast.error('Escribe un PVP válido.'); setGuardando(true); const { error } = await supabaseBrowser().rpc('fn_revendedor_precio', { p_product_id: p.id, p_pvp_cents: cents }); setGuardando(false); if (error) return toast.error(mensajeError(error.message)); toast.success('Precio de venta guardado') }
  return <div className="tarjeta p-4"><p className="font-semibold">{p.nombre}</p><p className="mt-1 text-xs text-tenue">Tu costo {usd(p.precio_cents)} · sugerido {usd(p.pvp_sugerido_cents)}</p><div className="mt-3 flex gap-2"><label className="min-w-0 flex-1"><span className="mb-1 block text-xs text-tenue">Tu PVP (USD)</span><input className="campo cifra" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardar()} /></label><button onClick={guardar} disabled={guardando} className="btn btn-primario mt-5 px-3">{guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar</button></div><p className={`mt-2 text-xs ${ganancia !== null && ganancia >= 0 ? 'text-ok' : 'text-error'}`}>Ganancia por pin: {ganancia === null ? '—' : usd(ganancia)}</p></div>
}
