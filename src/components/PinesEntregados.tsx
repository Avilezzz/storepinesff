'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Flag, CopyCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import Dialogo from './ui/Dialogo'

export type Pin = { id: number; codigo: string; estado: string; order_item_id: number }

const MOTIVOS = ['El código ya fue canjeado', 'El código no es válido', 'Otro problema']

export default function PinesEntregados({ pines, reclamados }: { pines: Pin[]; reclamados: Set<number | null> }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [copiado, setCopiado] = useState<number | null>(null)
  const [reclamando, setReclamando] = useState<Pin | null>(null)
  const [motivo, setMotivo] = useState(MOTIVOS[0])

  async function copiar(texto: string, marca: number, aviso: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(marca)
      setTimeout(() => setCopiado(null), 1600)
      toast.success(aviso)
    } catch {
      toast.error('Tu navegador no permitió copiar. Selecciona el código a mano.')
    }
  }

  async function enviarReclamo() {
    if (!reclamando) return
    const { error } = await sb.rpc('fn_reclamo_crear', {
      p_pin_code_id: reclamando.id, p_motivo: motivo, p_descripcion: null,
    })
    if (error) { toast.error(mensajeError(error.message)); return }

    setReclamando(null)
    toast.success('Reclamo enviado. Lo revisaremos pronto.')
    router.refresh()
  }

  return (
    <>
      {pines.length > 1 && (
        <button
          onClick={() => copiar(pines.map((p) => p.codigo).join('\n'), -1, `${pines.length} códigos copiados`)}
          className="btn btn-suave mb-2.5 w-full sm:w-auto">
          {copiado === -1 ? <><Check size={14} className="text-ok" /> Copiados</>
            : <><CopyCheck size={14} /> Copiar los {pines.length} códigos</>}
        </button>
      )}

      <div className="space-y-2">
        {pines.map((p) => {
          const defectuoso = p.estado === 'DEFECTUOSO'
          const yaReclamado = reclamados.has(p.id)

          return (
            <div key={p.id} className="tarjeta p-3.5">
              <code className={`block break-all font-mono text-[0.8125rem] leading-relaxed tracking-wide ${
                defectuoso ? 'text-tenue line-through' : ''}`}>
                {p.codigo}
              </code>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-linea pt-2.5">
                {defectuoso ? (
                  <span className="chip bg-error/12 text-error">Reembolsado</span>
                ) : yaReclamado ? (
                  <span className="chip bg-alerta/12 text-alerta">Reclamo en revisión</span>
                ) : (
                  <>
                    <button onClick={() => { setReclamando(p); setMotivo(MOTIVOS[0]) }}
                      className="enlace text-xs hover:text-error">
                      <Flag size={13} /> Reportar problema
                    </button>
                    <button onClick={() => copiar(p.codigo, p.id, 'Código copiado')}
                      className="btn btn-suave px-3 py-1.5 text-xs">
                      {copiado === p.id ? <><Check size={13} className="text-ok" /> Copiado</>
                        : <><Copy size={13} /> Copiar</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pines.length === 0 && (
        <p className="tarjeta px-4 py-8 text-center text-sm text-tenue">
          Esta orden no tiene pines asociados.
        </p>
      )}

      <Dialogo
        abierto={!!reclamando}
        titulo="Reportar un problema"
        peligro
        textoConfirmar="Enviar reclamo"
        onCerrar={() => setReclamando(null)}
        onConfirmar={enviarReclamo}
        descripcion={
          <>
            <code className="mb-3 block break-all font-mono text-xs text-tenue">{reclamando?.codigo}</code>
            <div className="space-y-1.5">
              {MOTIVOS.map((m) => (
                <label key={m}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    motivo === m ? 'border-marca bg-marca/8 text-white' : 'border-linea bg-panel2'}`}>
                  <input type="radio" name="motivo" checked={motivo === m}
                    onChange={() => setMotivo(m)} className="accent-marca" />
                  {m}
                </label>
              ))}
            </div>
          </>
        }
      />
    </>
  )
}
