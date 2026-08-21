'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Send, Eye, UserCheck, UserMinus, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { fecha, mensajeError } from '@/lib/format'
import Dialogo from '../ui/Dialogo'

export type Stats = {
  suscritos: number; de_baja: number; enviados_hoy: number; ultima_campana: string | null
}

/** Puntos de partida. La idea es avisar de algo real, no repetir "visítanos". */
const IDEAS = [
  {
    txt: 'Stock nuevo',
    asunto: 'Llegaron pines nuevos, {nombre}',
    mensaje: '{nombre}, acabamos de cargar pines de todas las denominaciones.\n\n' +
      'Ya sabes cómo funciona: recargas tu saldo y el código te llega al instante, sin esperar a nadie.',
  },
  {
    txt: 'Te extrañamos',
    asunto: '{nombre}, hace rato que no te vemos',
    mensaje: 'Hola {nombre}, pasamos a saludar.\n\n' +
      'La tienda sigue abierta y con stock. Si andas necesitando diamantes, entra y en dos minutos los tienes.',
  },
  {
    txt: 'Tienes saldo',
    asunto: '{nombre}, tienes saldo esperándote',
    mensaje: '{nombre}, te quedó saldo en tu billetera de FFPINS.\n\n' +
      'No caduca ni se pierde, pero ahí no te sirve de nada. Entra y cámbialo por diamantes cuando quieras.',
  },
]

const LIMITE_DIARIO = 100

export default function AdminNovedades({ stats }: { stats: Stats }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  const cupo = Math.max(0, LIMITE_DIARIO - stats.enviados_hoy)
  const alcance = Math.min(stats.suscritos, cupo)

  function usarIdea(i: (typeof IDEAS)[number]) {
    setAsunto(i.asunto)
    setMensaje(i.mensaje)
  }

  /** La vista previa reemplaza el comodín igual que lo hará la base de datos. */
  const previa = (t: string) => t.replace(/\{nombre\}/g, 'Luis')

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
        <div className="sin-barra mb-4 flex gap-1.5 overflow-x-auto">
          {IDEAS.map((i) => (
            <button key={i.txt} type="button" onClick={() => usarIdea(i)}
              className="chip shrink-0 border border-linea bg-panel2 px-2.5 py-1.5 text-tenue transition hover:border-marca/50 hover:text-marca">
              {i.txt}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-xs font-medium text-tenue">Asunto</label>
        <input className="campo" placeholder="Llegaron pines nuevos, {nombre}"
          value={asunto} onChange={(e) => setAsunto(e.target.value)} />

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Mensaje</label>
        <textarea className="campo min-h-40 resize-y" rows={7}
          placeholder="Escribe como le hablarías a un cliente. Usa {nombre} donde quieras su nombre."
          value={mensaje} onChange={(e) => setMensaje(e.target.value)} />

        <p className="mt-2 text-[11px] leading-relaxed text-tenue/70">
          Escribe <code className="cifra text-marca">{'{nombre}'}</code> y se reemplaza por el
          nombre de cada cliente. Cada correo lleva su enlace para darse de baja.
        </p>

        {(asunto || mensaje) && (
          <div className="mt-4 rounded-xl border border-linea bg-panel2 p-4">
            <p className="etiqueta mb-2 flex items-center gap-1.5">
              <Eye size={12} /> Así lo recibe Luis
            </p>
            <p className="text-sm font-semibold">{previa(asunto) || 'Sin asunto'}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-tenue">
              {previa(mensaje)}
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

      <Dialogo
        abierto={confirmar}
        titulo={`Enviar a ${alcance} cliente${alcance === 1 ? '' : 's'}`}
        descripcion={`"${previa(asunto)}". Esto no se puede deshacer: el correo sale de inmediato. ¿Ya te mandaste la prueba?`}
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
