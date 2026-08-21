'use client'

import { useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'
import type { ClienteBase } from './ModalAjuste'
import SelectorPlantillas from './SelectorPlantillas'
import { usePrevia, type Plantilla } from './plantillas'

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
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // La previa se resuelve contra ESTE cliente, así que se lee tal cual le va a
  // llegar a él: su nombre, su saldo, lo que suele comprar.
  const previaAsunto = usePrevia(asunto, cliente.id)
  const previaMensaje = usePrevia(mensaje, cliente.id)

  function elegir(p: Plantilla) {
    setAsunto(p.asunto)
    setMensaje(p.cuerpo)
  }

  /** Inserta la variable donde está el cursor, no al final del texto. */
  function insertar(v: string) {
    const el = areaRef.current
    if (!el) return setMensaje((m) => m + v)
    const { selectionStart: i, selectionEnd: j } = el
    setMensaje((m) => m.slice(0, i) + v + m.slice(j))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(i + v.length, i + v.length)
    })
  }

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
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar nombre={cliente.nombre} size={38} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">Escribir a {cliente.nombre}</h3>
            <p className="truncate text-xs text-tenue">{cliente.email}</p>
          </div>
        </div>

        <SelectorPlantillas ambito="individual" onElegir={elegir} onInsertar={insertar} />

        <label className="mb-1.5 block text-xs font-medium text-tenue">Asunto</label>
        <input className="campo" placeholder="Sobre tu recarga, {nombre}"
          value={asunto} onChange={(e) => setAsunto(e.target.value)} />

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Mensaje</label>
        <textarea ref={areaRef} className="campo min-h-32 resize-y" rows={5}
          placeholder={`Hola {nombre}, te escribo porque…`}
          value={mensaje} onChange={(e) => setMensaje(e.target.value)} />

        {(asunto || mensaje) && (
          <div className="mt-3.5 rounded-xl border border-linea bg-panel2 p-3.5">
            <p className="etiqueta mb-2 flex items-center gap-1.5">
              <Eye size={12} /> Así lo recibe {cliente.nombre.split(' ')[0]}
            </p>
            <p className="text-sm font-semibold">{previaAsunto || 'Sin asunto'}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-tenue">
              {previaMensaje}
            </p>
          </div>
        )}

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
