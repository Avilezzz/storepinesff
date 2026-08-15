'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle2, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError, fecha, usd, aCentavos } from '@/lib/format'
import Dialogo from '@/components/ui/Dialogo'

export type ProductoStock = {
  id: string; nombre: string; diamantes: number
  stock_disponible: number; activo: boolean
  vendidos: number; defectuosos: number
  costo_cents: number
}

export type PinLibre = {
  id: number; codigo: string; product_id: string; created_at: string
}

export default function AdminCodigos({ productos, libres }: {
  productos: ProductoStock[]
  libres: PinLibre[]
}) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [destino, setDestino] = useState(productos[0]?.id ?? '')
  const [texto, setTexto] = useState('')
  const [costo, setCosto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{ insertados: number; duplicados: number } | null>(null)
  const [marcados, setMarcados] = useState<Set<number>>(new Set())
  const [confirmar, setConfirmar] = useState(false)
  const [borrando, setBorrando] = useState(false)

  // La lista de borrado sigue al producto elegido arriba: un solo selector
  // para las dos operaciones evita equivocarse de producto al eliminar.
  const delProducto = libres.filter((p) => p.product_id === destino)
  const prodDestino = productos.find((p) => p.id === destino)
  const nombreDestino = prodDestino?.nombre ?? ''
  const costoActual = prodDestino?.costo_cents ?? 0

  function alternar(id: number) {
    setMarcados((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  function alternarTodos() {
    const ids = delProducto.map((p) => p.id)
    const todos = ids.every((id) => marcados.has(id))
    setMarcados((prev) => {
      const s = new Set(prev)
      ids.forEach((id) => (todos ? s.delete(id) : s.add(id)))
      return s
    })
  }

  async function borrar() {
    const ids = delProducto.filter((p) => marcados.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return

    setBorrando(true)
    const { data, error } = await sb.rpc('fn_borrar_codigos', { p_ids: ids })
    setBorrando(false)
    setConfirmar(false)

    if (error) { toast.error(mensajeError(error.message)); return }

    const n = Number(data ?? 0)
    setMarcados(new Set())
    toast.success(`${n} pin${n === 1 ? '' : 'es'} eliminado${n === 1 ? '' : 's'}`)
    router.refresh()
  }

  const seleccionados = delProducto.filter((p) => marcados.has(p.id)).length

  // Un pin por línea; también acepta que estén separados por comas o espacios.
  const codigos = useMemo(
    () => [...new Set(texto.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))],
    [texto],
  )

  async function cargar() {
    if (!destino)             return toast.error('Elige a qué producto pertenecen los pines.')
    if (codigos.length === 0) return toast.error('Pega al menos un código.')

    // Sin costo escrito se usa el que ya tiene el producto. Con costo, además
    // pasa a ser el nuevo de referencia: el proveedor cambió su precio.
    const cents = costo.trim() ? aCentavos(costo) : null
    if (costo.trim() && (cents === null || cents <= 0)) return toast.error('Costo inválido.')

    setCargando(true)
    setResultado(null)
    const { data, error } = await sb.rpc('fn_cargar_codigos', {
      p_product_id: destino, p_codigos: codigos, p_costo_cents: cents,
    })
    setCargando(false)

    if (error) return toast.error(mensajeError(error.message))

    const r = (Array.isArray(data) ? data[0] : data) as { insertados: number; duplicados: number }
    setResultado(r)
    setTexto('')
    setCosto('')
    toast.success(`${r.insertados} pin${r.insertados === 1 ? '' : 'es'} cargados`)
    router.refresh()
  }

  return (
    <>
      <h1 className="titulo mb-4">Pines</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="tarjeta p-4 sm:p-5">
          <h2 className="subtitulo">Cargar pines nuevos</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-tenue">
            Un código por línea. Los que ya existan se ignoran automáticamente.
          </p>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-tenue">Producto</label>
            <select className="campo" value={destino} onChange={(e) => setDestino(e.target.value)}>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.stock_disponible} en stock</option>
              ))}
            </select>
          </div>

          <div className="mt-3.5">
            <label className="mb-1.5 block text-xs font-medium text-tenue">
              Costo por pin (opcional)
            </label>
            <input className="campo" inputMode="decimal"
              placeholder={costoActual > 0 ? (costoActual / 100).toFixed(2) : '0.85'}
              value={costo} onChange={(e) => setCosto(e.target.value)} />
            <p className="mt-1.5 text-[11px] leading-relaxed text-tenue">
              {costoActual > 0
                ? <>Vacío usa el costo actual: <span className="cifra">{usd(costoActual)}</span>. Escríbelo solo si esta compra te salió a otro precio.</>
                : 'Este producto aún no tiene costo cargado.'}
            </p>
          </div>

          <div className="mt-3.5">
            <label className="mb-1.5 block text-xs font-medium text-tenue">Códigos</label>
            <textarea rows={9} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={'8D86E5E8-2CD5-48BD-A94C-5F9868963296\n4A11C9F2-77B0-4E31-9D52-1C3E8A0B7745'}
              className="campo resize-y font-mono text-xs leading-relaxed" />
            <p className="mt-1.5 text-[11px] text-tenue">
              {codigos.length} código{codigos.length === 1 ? '' : 's'} único{codigos.length === 1 ? '' : 's'}
            </p>
          </div>

          {resultado && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-ok/10 px-3 py-2.5 text-sm text-ok">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <span>
                {resultado.insertados} pin{resultado.insertados === 1 ? '' : 'es'} cargados
                {resultado.duplicados > 0 && ` · ${resultado.duplicados} ya existían y se omitieron`}
              </span>
            </p>
          )}

          <button onClick={cargar} disabled={cargando || codigos.length === 0}
            className="btn btn-primario mt-4 w-full">
            {cargando ? <><Loader2 size={15} className="animate-spin" /> Cargando…</>
              : <><Upload size={15} /> Cargar {codigos.length || ''} pines</>}
          </button>
        </div>

        <div className="tarjeta overflow-hidden">
          <h2 className="subtitulo border-b border-linea p-4">Inventario</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linea">
                  <th className="etiqueta p-3 text-left">Producto</th>
                  <th className="etiqueta p-3 text-right">Libres</th>
                  <th className="etiqueta p-3 text-right">Vendidos</th>
                  <th className="etiqueta p-3 text-right">Defect.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      <span className="font-medium">{p.nombre}</span>
                      {!p.activo && <span className="chip ml-2 bg-tenue/12 text-tenue">Oculto</span>}
                    </td>
                    <td className={`cifra p-3 text-right font-semibold ${
                      p.stock_disponible === 0 ? 'text-error'
                      : p.stock_disponible <= 5 ? 'text-alerta' : 'text-ok'}`}>
                      {p.stock_disponible}
                    </td>
                    <td className="cifra p-3 text-right text-tenue">{p.vendidos}</td>
                    <td className="cifra p-3 text-right text-tenue">{p.defectuosos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="tarjeta mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea p-4">
          <div>
            <h2 className="subtitulo">Pines libres de {nombreDestino || 'este producto'}</h2>
            <p className="mt-0.5 text-xs text-tenue">
              Solo aparecen los que nadie compró. Los vendidos no se pueden
              borrar: son el respaldo de la compra del cliente.
            </p>
          </div>

          {seleccionados > 0 && (
            <button onClick={() => setConfirmar(true)} className="btn btn-peligro">
              <Trash2 size={15} /> Borrar {seleccionados}
            </button>
          )}
        </div>

        {delProducto.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-tenue">
            No hay pines libres de este producto.
          </p>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-linea px-4 py-2.5 text-xs text-tenue transition hover:bg-panel2">
              <input type="checkbox" className="accent-marca"
                checked={delProducto.every((p) => marcados.has(p.id))}
                onChange={alternarTodos} />
              Seleccionar los {delProducto.length}
            </label>

            <div className="max-h-96 overflow-y-auto">
              {delProducto.map((p) => (
                <label key={p.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-linea px-4 py-2.5 text-sm transition last:border-0 hover:bg-panel2">
                  <input type="checkbox" className="accent-marca"
                    checked={marcados.has(p.id)} onChange={() => alternar(p.id)} />
                  <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide">
                    {p.codigo}
                  </code>
                  <span className="shrink-0 text-[11px] text-tenue/60">{fecha(p.created_at)}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialogo
        abierto={confirmar}
        titulo={`¿Borrar ${seleccionados} pin${seleccionados === 1 ? '' : 'es'}?`}
        peligro
        textoConfirmar={borrando ? 'Borrando…' : 'Sí, borrar'}
        onCerrar={() => setConfirmar(false)}
        onConfirmar={borrar}
        descripcion={
          <>
            <p className="leading-relaxed">
              Se eliminarán de {nombreDestino} y el stock bajará a{' '}
              <span className="cifra font-semibold">
                {Math.max(0, delProducto.length - seleccionados)}
              </span>. Esto no se puede deshacer.
            </p>
            <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-ok/10 px-3 py-2 text-xs text-ok">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Ningún pin ya vendido se toca: solo se borran los que nadie compró.
            </p>
          </>
        }
      />
    </>
  )
}
