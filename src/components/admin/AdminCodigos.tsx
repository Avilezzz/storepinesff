'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'

export type ProductoStock = {
  id: string; nombre: string; diamantes: number
  stock_disponible: number; activo: boolean
  vendidos: number; defectuosos: number
}

export default function AdminCodigos({ productos }: { productos: ProductoStock[] }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [destino, setDestino] = useState(productos[0]?.id ?? '')
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<{ insertados: number; duplicados: number } | null>(null)

  // Un pin por línea; también acepta que estén separados por comas o espacios.
  const codigos = useMemo(
    () => [...new Set(texto.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean))],
    [texto],
  )

  async function cargar() {
    if (!destino)             return toast.error('Elige a qué producto pertenecen los pines.')
    if (codigos.length === 0) return toast.error('Pega al menos un código.')

    setCargando(true)
    setResultado(null)
    const { data, error } = await sb.rpc('fn_cargar_codigos', {
      p_product_id: destino, p_codigos: codigos,
    })
    setCargando(false)

    if (error) return toast.error(mensajeError(error.message))

    const r = (Array.isArray(data) ? data[0] : data) as { insertados: number; duplicados: number }
    setResultado(r)
    setTexto('')
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
    </>
  )
}
