'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, aCentavos, mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'

/** Lo mínimo que necesitan los modales: sirve tanto para la lista como para la ficha. */
export type ClienteBase = { id: string; nombre: string; email: string; saldo_cents: number }

const ATAJOS_MONTO = [200, 500, 1000, 2000]

// Plantillas de motivo: el ajuste manual no tiene comprobante adjunto, así que
// esta frase es a la vez el respaldo en el libro mayor y el texto que le llega
// al usuario en la notificación. Se puede editar después de elegirla.
const MOTIVOS: Record<'acreditar' | 'descontar', string[]> = {
  acreditar: ['Saldo acreditado', 'Recarga manual', 'Bono', 'Corrección'],
  descontar: ['Ajuste de saldo', 'Corrección', 'Reverso'],
}

export default function ModalAjuste({ cliente, onCerrar, onListo }: {
  cliente: ClienteBase; onCerrar: () => void; onListo: () => void
}) {
  const sb = supabaseBrowser()
  const [signo, setSigno] = useState<1 | -1>(1)
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cents = aCentavos(monto)
  const saldo = cliente.saldo_cents
  const resultante = saldo + (cents ?? 0) * signo

  /** Al cambiar de sentido se descarta la plantilla anterior: "Bono" no tiene
   *  sentido en un descuento. Un motivo escrito a mano se respeta. */
  function cambiarSigno(nuevo: 1 | -1) {
    if (signo !== nuevo && Object.values(MOTIVOS).flat().includes(motivo)) setMotivo('')
    setSigno(nuevo)
  }

  async function aplicar() {
    if (cents === null || cents <= 0)  return toast.error('Monto inválido.')
    if (!motivo.trim())                return toast.error('Escribe el motivo del ajuste.')
    if (signo === -1 && cents > saldo) return toast.error('El usuario no tiene saldo suficiente.')

    setGuardando(true)
    const { error } = await sb.rpc('fn_ajustar_saldo', {
      p_user_id: cliente.id, p_amount_cents: cents * signo, p_motivo: motivo.trim(),
    })
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(`Saldo de ${cliente.nombre}: ${usd(resultante)}`)
    onListo()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center velo p-0 sm:items-center sm:p-4"
      onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={cliente.nombre} size={38} />
          <div>
            <h3 className="subtitulo">Ajustar saldo</h3>
            <p className="cifra text-xs text-tenue">{cliente.nombre} · {usd(saldo)} actual</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => cambiarSigno(1)}
            className={`btn flex-1 ${signo === 1 ? 'btn-primario' : 'btn-suave'}`}>
            <Plus size={15} /> Acreditar
          </button>
          <button onClick={() => cambiarSigno(-1)}
            className={`btn flex-1 ${signo === -1 ? 'btn-peligro' : 'btn-suave'}`}>
            <Minus size={15} /> Descontar
          </button>
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-xs font-medium text-tenue">Monto (USD)</label>
          <input className="campo" inputMode="decimal" placeholder="2.00" autoFocus
            value={monto} onChange={(e) => setMonto(e.target.value)} />
          <div className="sin-barra mt-2 flex gap-1.5 overflow-x-auto">
            {ATAJOS_MONTO.map((c) => (
              <button key={c} type="button" onClick={() => setMonto((c / 100).toFixed(2))}
                className={`chip shrink-0 border px-2.5 py-1.5 transition ${
                  cents === c ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
                {usd(c)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-xs font-medium text-tenue">
            Motivo (queda en el libro mayor y lo ve el usuario)
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {MOTIVOS[signo === 1 ? 'acreditar' : 'descontar'].map((m) => (
              <button key={m} type="button" onClick={() => setMotivo(m)}
                className={`chip shrink-0 border px-2.5 py-1.5 text-left transition ${
                  motivo === m ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
                {m}
              </button>
            ))}
          </div>
          <input className="campo" placeholder="O escríbelo a mano"
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicar()} />
        </div>

        {cents !== null && cents > 0 && (
          <p className="mt-3.5 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2.5 text-sm">
            <span className="text-tenue">Saldo resultante</span>
            <span className={`cifra font-semibold ${resultante < 0 ? 'text-error' : ''}`}>
              {usd(Math.max(0, resultante))}
            </span>
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onCerrar} className="btn btn-suave flex-1">Cancelar</button>
          <button onClick={aplicar} disabled={guardando} className="btn btn-primario flex-1">
            {guardando ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
