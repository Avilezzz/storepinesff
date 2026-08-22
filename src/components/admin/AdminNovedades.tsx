'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Megaphone, Send, Eye, UserCheck, UserMinus, Gauge, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { fecha, mensajeError } from '@/lib/format'
import Dialogo from '../ui/Dialogo'
import SelectorPlantillas from './SelectorPlantillas'
import { usePrevia, type Plantilla } from './plantillas'

export type Stats = {
  suscritos: number; de_baja: number; enviados_hoy: number; ultima_campana: string | null
}

const LIMITE_DIARIO = 100

export default function AdminNovedades({ stats }: { stats: Stats }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const cupo = Math.max(0, LIMITE_DIARIO - stats.enviados_hoy)
  const alcance = Math.min(stats.suscritos, cupo)

  // Sin cliente concreto, la previa se resuelve contra tus propios datos: es lo
  // más parecido a un correo real que se puede enseñar antes de elegir a quién.
  const previaAsunto = usePrevia(asunto)
  const previaMensaje = usePrevia(mensaje)

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

  async function enviar(prueba: boolean) {
    if (!asunto.trim())  return toast.error('Escribe el asunto.')
    if (!mensaje.trim()) return toast.error('Escribe el mensaje.')

    setEnviando(true)
    const { data, error } = await sb.rpc('fn_admin_campana', {
      p_asunto: asunto.trim(), p_mensaje: mensaje.trim(), p_prueba: prueba,
    })
    setEnviando(false)
    setConfirmar(false)

    if (error) return toast.error(mensajeError(error.message))

    if (prueba) toast.success('Prueba enviada a tu correo. Revísala antes de mandarla a todos.')
    else {
      toast.success(`Enviado a ${data} cliente${data === 1 ? '' : 's'}`)
      setAsunto(''); setMensaje('')
    }
    router.refresh()
  }

  return (
    <>
      <h1 className="titulo mb-1">Novedades</h1>
      <p className="mb-4 text-sm text-tenue">
        Correo a todos los clientes que aceptaron recibirlo. Sale desde el subdominio de
        noticias, aparte de los correos de compras.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Kpi Icono={UserCheck} etiqueta="Les puedes escribir" valor={String(stats.suscritos)} />
        <Kpi Icono={UserMinus} etiqueta="De baja" valor={String(stats.de_baja)} />
        <Kpi Icono={Gauge} etiqueta="Cupo de hoy" valor={`${cupo}`} />
      </div>

      <div className="tarjeta p-5">
        <SelectorPlantillas ambito="novedades" onElegir={elegir} onInsertar={insertar} />

        <label className="mb-1.5 block text-xs font-medium text-tenue">Asunto</label>
        <input className="campo" placeholder="Llegaron pines nuevos, {nombre}"
          value={asunto} onChange={(e) => setAsunto(e.target.value)} />

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Mensaje</label>
        <textarea ref={areaRef} className="campo min-h-40 resize-y" rows={7}
          placeholder="Escribe como le hablarías a un cliente. Usa {nombre} donde quieras su nombre."
          value={mensaje} onChange={(e) => setMensaje(e.target.value)} />

        <p className="mt-2 text-[11px] leading-relaxed text-tenue">
          Cada cliente recibe el texto con sus propios datos. Todos los correos llevan
          su enlace para darse de baja.
        </p>

        {(asunto || mensaje) && (
          <div className="mt-4 rounded-xl border border-linea bg-panel2 p-4">
            <p className="etiqueta mb-2 flex items-center gap-1.5">
              <Eye size={12} /> Con tus datos se leería así
            </p>
            <p className="text-sm font-semibold">{previaAsunto || 'Sin asunto'}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-tenue">
              {previaMensaje}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => enviar(true)} disabled={enviando}
            className="btn btn-suave flex-1">
            <Eye size={15} /> Enviarme una prueba
          </button>
          <button onClick={() => setConfirmar(true)} disabled={enviando || alcance === 0}
            className="btn btn-primario flex-1">
            <Send size={15} /> Enviar a {alcance} cliente{alcance === 1 ? '' : 's'}
          </button>
        </div>

        {cupo < stats.suscritos && (
          <p className="mt-3 text-center text-xs text-alerta">
            El plan gratis de Resend permite {LIMITE_DIARIO} correos al día y hoy ya salieron{' '}
            {stats.enviados_hoy}. Se enviará a {alcance} y el resto mañana.
          </p>
        )}

        {stats.ultima_campana && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-tenue">
            <Megaphone size={12} /> Última campaña: {fecha(stats.ultima_campana)}
          </p>
        )}
      </div>

      <Link href="/admin/plantillas" className="enlace mt-4 justify-center hover:text-marca">
        <Settings2 size={14} /> Gestionar plantillas
      </Link>

      <Dialogo
        abierto={confirmar}
        titulo={`Enviar a ${alcance} cliente${alcance === 1 ? '' : 's'}`}
        descripcion={`"${previaAsunto}". Esto no se puede deshacer: el correo sale de inmediato. ¿Ya te mandaste la prueba?`}
        textoConfirmar="Sí, enviar"
        onConfirmar={() => { void enviar(false) }}
        onCerrar={() => setConfirmar(false)}
      />
    </>
  )
}

function Kpi({ Icono, etiqueta, valor }: { Icono: typeof UserCheck; etiqueta: string; valor: string }) {
  return (
    <div className="tarjeta px-3 py-3 text-center">
      <Icono size={14} className="mx-auto mb-1 text-tenue" />
      <p className="cifra text-lg font-semibold">{valor}</p>
      <p className="text-[11px] leading-tight text-tenue">{etiqueta}</p>
    </div>
  )
}
