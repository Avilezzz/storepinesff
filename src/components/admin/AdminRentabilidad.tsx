'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, Check, X, TrendingUp, Wallet, Package, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, aCentavos, mensajeError } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'

type ProductoRent = {
  id: string; nombre: string; diamantes: number; activo: boolean
  imagen_url: string | null
  precio_cents: number; costo_cents: number; stock: number
  invertido_cents: number; vendidos: number
  ganado_cents: number; perdido_cents: number
}

export type Rentabilidad = {
  productos: ProductoRent[]
  invertido_cents: number
  stock_venta_cents: number
  ganado_total_cents: number
  ganado_mes_cents: number
  perdido_cents: number
  deuda_clientes_cents: number
}

const margen = (precio: number, costo: number) =>
  precio > 0 ? Math.round(((precio - costo) / precio) * 1000) / 10 : 0

export default function AdminRentabilidad({ datos }: { datos: Rentabilidad }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [costo, setCosto] = useState('')

  const p = datos?.productos ?? []
  const gananciaPotencial = (datos?.stock_venta_cents ?? 0) - (datos?.invertido_cents ?? 0)
  const respaldado = (datos?.stock_venta_cents ?? 0) >= (datos?.deuda_clientes_cents ?? 0)
  const sinCosto = p.filter((x) => x.costo_cents <= 0)
  const enPerdida = p.filter((x) => x.costo_cents > 0 && x.precio_cents <= x.costo_cents)

  async function guardar(prod: ProductoRent) {
    const cents = aCentavos(costo)
    if (cents === null || cents <= 0) return toast.error('Costo inválido.')
    if (cents === prod.costo_cents) return setEditando(null)

    const { error } = await sb.from('products').update({ costo_cents: cents }).eq('id', prod.id)
    if (error) return toast.error(mensajeError(error.message))

    setEditando(null)
    toast.success(`${prod.nombre}: costo ${usd(cents)} · ganas ${usd(prod.precio_cents - cents)}`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="titulo">Costos y ganancia</h1>
        <p className="mt-0.5 text-xs leading-relaxed text-tenue">
          Lo que te cobra el proveedor. Cada pin guarda el costo que tenía al
          cargarlo, así cambiar este número no altera tus ganancias pasadas.
        </p>
      </div>

      {sinCosto.length > 0 && (
        <p className="tarjeta mb-3 flex items-center gap-2.5 border-alerta/40 bg-alerta/8 p-3.5 text-sm text-alerta">
          <AlertTriangle size={16} className="shrink-0" />
          {sinCosto.length} producto{sinCosto.length === 1 ? '' : 's'} sin costo cargado:
          su ganancia se calcula como si fueran gratis.
        </p>
      )}

      {enPerdida.length > 0 && (
        <p className="tarjeta mb-3 flex items-center gap-2.5 border-error/40 bg-error/8 p-3.5 text-sm text-error">
          <AlertTriangle size={16} className="shrink-0" />
          Vendes {enPerdida.map((x) => x.nombre).join(', ')} por debajo del costo.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi titulo="Invertido en stock" valor={usd(datos?.invertido_cents ?? 0)}
          pie="Dinero parado en pines" Icono={Package} />
        <Kpi titulo="Si vendes todo" valor={usd(datos?.stock_venta_cents ?? 0)}
          pie={`Ganarías ${usd(gananciaPotencial)}`} />
        <Kpi titulo="Ganado este mes" valor={usd(datos?.ganado_mes_cents ?? 0)} destacado
          Icono={TrendingUp} />
        <Kpi titulo="Ganado histórico" valor={usd(datos?.ganado_total_cents ?? 0)}
          pie={datos?.perdido_cents ? `−${usd(datos.perdido_cents)} en reclamos` : undefined} />
      </div>

      {/* La regla que evita quebrar: el stock tiene que poder cubrir el saldo
          que los clientes ya te pagaron. */}
      <div className={`tarjeta mt-2.5 flex flex-wrap items-center gap-3 p-4 ${
        respaldado ? 'border-ok/30' : 'border-error/40 bg-error/8'}`}>
        {respaldado
          ? <ShieldCheck size={18} className="shrink-0 text-ok" />
          : <AlertTriangle size={18} className="shrink-0 text-error" />}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${respaldado ? 'text-ok' : 'text-error'}`}>
            {respaldado ? 'Tu stock cubre lo que debes' : 'Tu stock no alcanza para lo que debes'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-tenue">
            Clientes con saldo: <span className="cifra">{usd(datos?.deuda_clientes_cents ?? 0)}</span>
            {' · '}Stock a precio de venta: <span className="cifra">{usd(datos?.stock_venta_cents ?? 0)}</span>
            {!respaldado && ' — carga pines o guarda ese dinero para responder.'}
          </p>
        </div>
      </div>

      <div className="tarjeta mt-4 overflow-x-auto">
        <table className="w-full min-w-3xl text-sm">
          <thead>
            <tr className="border-b border-linea">
              <th className="etiqueta p-3 text-left">Producto</th>
              <th className="etiqueta p-3 text-right">Costo</th>
              <th className="etiqueta p-3 text-right">Precio</th>
              <th className="etiqueta p-3 text-right">Ganas</th>
              <th className="etiqueta p-3 text-right">Margen</th>
              <th className="etiqueta p-3 text-right">Stock</th>
              <th className="etiqueta p-3 text-right">Invertido</th>
              <th className="etiqueta p-3 text-right">Vendidos</th>
              <th className="etiqueta p-3 text-right">Ganado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {p.map((x) => {
              const gana = x.precio_cents - x.costo_cents
              const m = margen(x.precio_cents, x.costo_cents)

              return (
                <tr key={x.id} className={x.activo ? '' : 'opacity-50'}>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <ImagenProducto url={x.imagen_url} alt={x.nombre} sizes="40px"
                        iconoSize={13} className="h-10 w-8 shrink-0 rounded-md" />
                      <span className="font-medium">{x.nombre}</span>
                    </div>
                  </td>

                  <td className="p-3 text-right">
                    {editando === x.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input autoFocus className="campo w-20 py-1 text-right text-sm" value={costo}
                          onChange={(e) => setCosto(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') guardar(x)
                            if (e.key === 'Escape') setEditando(null)
                          }} />
                        <button onClick={() => guardar(x)} className="btn-icono" aria-label="Guardar">
                          <Check size={15} className="text-ok" />
                        </button>
                        <button onClick={() => setEditando(null)} className="btn-icono" aria-label="Cancelar">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditando(x.id); setCosto((x.costo_cents / 100).toFixed(2)) }}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-panel2">
                        <span className={`cifra font-semibold ${x.costo_cents <= 0 ? 'text-alerta' : ''}`}>
                          {x.costo_cents > 0 ? usd(x.costo_cents) : 'sin costo'}
                        </span>
                        <Pencil size={12} className="text-tenue" />
                      </button>
                    )}
                  </td>

                  <td className="cifra p-3 text-right">{usd(x.precio_cents)}</td>
                  <td className={`cifra p-3 text-right font-semibold ${gana > 0 ? 'text-ok' : 'text-error'}`}>
                    {usd(gana)}
                  </td>
                  <td className={`cifra p-3 text-right ${
                    m >= 30 ? 'text-ok' : m >= 20 ? 'text-alerta' : 'text-error'}`}>
                    {m}%
                  </td>
                  <td className={`cifra p-3 text-right ${
                    x.stock === 0 ? 'text-error' : x.stock <= 5 ? 'text-alerta' : ''}`}>
                    {x.stock}
                  </td>
                  <td className="cifra p-3 text-right text-tenue">{usd(x.invertido_cents)}</td>
                  <td className="cifra p-3 text-right text-tenue">{x.vendidos}</td>
                  <td className="cifra p-3 text-right font-semibold text-marca">
                    {usd(x.ganado_cents - x.perdido_cents)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-tenue">
        <strong className="font-medium text-white">Margen</strong>: cuánto de cada
        venta te queda. Verde 30% o más, ámbar entre 20 y 30, rojo por debajo.
        <br />
        <strong className="font-medium text-white">Invertido</strong>: lo que
        pagaste por los pines que aún no vendes.
      </p>
    </>
  )
}

function Kpi({ titulo, valor, pie, destacado, Icono }: {
  titulo: string; valor: string; pie?: string; destacado?: boolean
  Icono?: typeof Wallet
}) {
  return (
    <div className="tarjeta p-4">
      <p className="etiqueta flex items-center gap-1.5">
        {Icono && <Icono size={12} />} {titulo}
      </p>
      <p className={`cifra mt-1 text-xl font-semibold ${destacado ? 'text-marca' : ''}`}>{valor}</p>
      {pie && <p className="mt-0.5 text-[11px] text-tenue">{pie}</p>}
    </div>
  )
}
