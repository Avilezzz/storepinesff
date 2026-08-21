'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'
import type { ClienteBase } from './ModalAjuste'

/** Los asuntos de siempre, para no escribirlos cada vez. Son editables. */
const ASUNTOS = ['Sobre tu recarga', 'Sobre tu compra', 'Sobre tu reclamo', 'Novedades de FFPINS']

/**
 * Correo suelto a un cliente. Sale con la plantilla y el logo de la tienda, no
 * como un Gmail cualquiera, y queda anotado en email_log.
 */
export default function ModalCorreo({ cliente, onCerrar }: {
  cliente: ClienteBase; onCerrar: () => void
}) {
  const sb = supabaseBrowser()
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!asunto.trim())  return toast.error('Escribe el asunto.')
    if (!mensaje.trim()) return toast.error('Escribe el mensaje.')

    setEnviando(true)
    const { error } = await sb.rpc('fn_admin_enviar_email', {
      p_user_id: cliente.id, p_asunto: asunto.trim(), p_mensaje: mensaje.trim(),
    })
    setEnviando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(`Correo enviado a ${cliente.nombre}`)
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center velo p-0 sm:items-center sm:p-4"
      onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={cliente.nombre} size={38} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">Escribir a {cliente.nombre}</h3>
            <p className="truncate text-xs text-tenue">{cliente.email}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-tenue">Asunto</label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ASUNTOS.map((a) => (
              <button key={a} type="button" onClick={() => setAsunto(a)}
                className={`chip shrink-0 border px-2.5 py-1.5 text-left transition ${
                  asunto === a ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
                {a}
              </button>
            ))}
          </div>
          <input className="campo" placeholder="O escríbelo a mano" autoFocus
            value={asunto} onChange={(e) => setAsunto(e.target.value)} />
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-xs font-medium text-tenue">Mensaje</label>
          <textarea className="campo min-h-32 resize-y" rows={5}
            placeholder={`Hola ${cliente.nombre.split(' ')[0]}, te escribo porque…`}
            value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          <p className="mt-1.5 text-[11px] text-tenue/70">
            Se envía con el logo de FFPINS. Si el cliente responde, te llega a tu correo.
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onCerrar} className="btn btn-suave flex-1">Cancelar</button>
          <button onClick={enviar} disabled={enviando} className="btn btn-primario flex-1">
            {enviando ? 'Enviando…' : 'Enviar correo'}
          </button>
        </div>
      </div>
    </div>
  )
}
