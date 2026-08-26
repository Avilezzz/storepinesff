'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import {
  X, ArrowUp, Zap, Wallet, Gem, ShoppingCart, ReceiptText, User, MessageCircle,
  TriangleAlert, ChevronRight,
} from 'lucide-react'
import Mascota, { type Gesto } from './ui/Mascota'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion } from '@/lib/sesion'
import { ACCIONES, avisoBasico, type Modo } from '@/lib/asistente'

type Burbuja = { id: string; mio: boolean; texto: string; modo?: Modo; acciones?: string[] }

const ICONOS = {
  wallet: Wallet, gem: Gem, cart: ShoppingCart, receipt: ReceiptText,
  user: User, chat: MessageCircle, alert: TriangleAlert,
} as const

/** Arranques para quien no sabe qué preguntar. No son respuestas: son atajos. */
const SUGERENCIAS = ['¿Cómo recargo saldo?', '¿Cuál es mi saldo?', '¿Cómo canjeo mi pin?']

const MAX = 500

/**
 * Asistente de la tienda: una bolita que abre un chat.
 *
 * Solo aparece con sesión iniciada — es para clientes, y así el servidor sabe
 * de quién habla sin preguntarle nada a nadie. La conversación vive en la base,
 * de modo que sigue ahí al volver mañana y el equipo puede leerla.
 */
export default function Asistente() {
  const sb = supabaseBrowser()
  const { uid, cargando } = useSesion()

  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Burbuja[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [degradado, setDegradado] = useState<number | null | false>(false)
  const [gesto, setGesto] = useState<Gesto>('reposo')
  const [whatsapp, setWhatsapp] = useState('')

  const fondo = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  // La conversación anterior se trae al abrir, no al cargar la página: no tiene
  // sentido consultarla para alguien que quizá nunca toque la bolita.
  useEffect(() => {
    if (!abierto || !uid || mensajes.length) return
    void (async () => {
      const { data } = await sb.from('assistant_messages')
        .select('id, rol, texto, modo, acciones').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(30)

      type Fila = { id: number; rol: string; texto: string; modo: Modo | null; acciones: string[] }
      const filas = (data as Fila[] | null) ?? []
      setMensajes(filas.reverse().map((m) => ({
        id: String(m.id), mio: m.rol === 'CLIENTE', texto: m.texto,
        modo: m.modo ?? undefined, acciones: m.acciones ?? [],
      })))
    })()
  }, [abierto, uid, sb, mensajes.length])

  // El botón de WhatsApp necesita el número de la tienda, que el admin puede
  // cambiar: se lee de la configuración en vez de quemarlo en el código.
  useEffect(() => {
    if (!abierto || whatsapp) return
    void (async () => {
      const { data } = await sb.from('app_settings').select('value').eq('key', 'contacto').single()
      const n = (data as { value: { whatsapp?: string } } | null)?.value?.whatsapp
      if (n) setWhatsapp(n)
    })()
  }, [abierto, whatsapp, sb])

  useEffect(() => {
    if (abierto) fondo.current?.scrollTo({ top: fondo.current.scrollHeight })
  }, [mensajes, abierto])

  // Al abrir saluda con la cara contenta y vuelve sola a la neutra: el gesto
  // hace de bienvenida sin ocupar una burbuja de conversación.
  useEffect(() => {
    if (!abierto) return
    setGesto('saludo')
    const t = setTimeout(() => setGesto('reposo'), 2800)
    return () => clearTimeout(t)
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [abierto])

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim().slice(0, MAX)
    if (!limpia || enviando) return

    const marca = Date.now()
    setTexto('')
    setEnviando(true)
    setMensajes((m) => [...m, { id: `y${marca}`, mio: true, texto: limpia }])

    try {
      const r = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: limpia }),
      })

      if (!r.ok || !r.body) {
        const { error } = await r.json().catch(() => ({ error: 'No pude responder. Intenta de nuevo.' }))
        setMensajes((m) => [...m, { id: `e${marca}`, mio: false, texto: String(error) }])
        return
      }

      const modo = (r.headers.get('X-Modo') as Modo) ?? 'IA'
      const min = r.headers.get('X-Reintento-Min')
      const acciones = (r.headers.get('X-Acciones') ?? '').split(',').filter(Boolean)
      setDegradado(modo === 'BASICO' ? (min ? Number(min) : null) : false)

      // La respuesta se pinta según llega: con el modelo se ve escribiéndose,
      // y con el modo básico llega de golpe porque ya está escrita.
      const id = `r${marca}`
      setMensajes((m) => [...m, { id, mio: false, texto: '', modo, acciones }])

      const lector = r.body.getReader()
      const dec = new TextDecoder()
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        const trozo = dec.decode(value, { stream: true })
        setMensajes((m) => m.map((b) => (b.id === id ? { ...b, texto: b.texto + trozo } : b)))
      }
    } catch {
      setMensajes((m) => [...m, {
        id: `x${marca}`, mio: false,
        texto: 'Se cortó la conexión. Revisa tu internet y vuelve a preguntar.',
      }])
    } finally {
      setEnviando(false)
      // Un guiño al acabar: se nota que terminó de escribir sin leer nada.
      setGesto('listo')
      setTimeout(() => setGesto('reposo'), 2500)
      campo.current?.focus()
    }
  }

  if (cargando || !uid) return null

  return (
    <>
      {/* La mascota es el botón: sube en móvil para no chocar con la barra de
          navegación de abajo, y flota despacio para pedir que la toquen. */}
      <motion.button
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
        animate={abierto ? { y: 0 } : { y: [0, -5, 0] }}
        transition={{ repeat: abierto ? 0 : Infinity, duration: 3.6, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-23 right-4 z-90 grid size-14 place-items-center rounded-full ring-2 ring-linea shadow-lg transition hover:ring-marca sm:bottom-6 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {abierto ? (
            <motion.span
              key="x"
              initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="grid size-full place-items-center rounded-full bg-marca text-sobre-marca"
            >
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="cara"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
            >
              <Mascota gesto={enviando ? 'pensando' : gesto} tam={56} halo={enviando} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            aria-label="Asistente"
            className="tarjeta fixed inset-x-3 bottom-38 top-16 z-90 flex flex-col overflow-hidden shadow-2xl sm:inset-x-auto sm:bottom-22 sm:right-6 sm:top-auto sm:h-[32rem] sm:w-92"
          >
            <header className="flex items-center gap-2.5 border-b border-linea px-4 py-3">
              <Mascota gesto={enviando ? 'pensando' : gesto} tam={34} halo={enviando} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fuerte">Asistente</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-tenue">
                  {degradado !== false
                    ? <><Zap size={10} className="text-alerta" /> {avisoBasico(degradado)}</>
                    : 'Te responde sobre tu cuenta y la tienda'}
                </p>
              </div>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="btn-icono">
                <X size={17} />
              </button>
            </header>

            <div ref={fondo} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              {mensajes.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Image src="/mascota/saluda.png" alt="" width={202} height={255}
                      priority className="h-32 w-auto" />
                  </motion.span>
                  <p className="text-sm text-tenue">
                    Pregúntame lo que quieras sobre tu saldo, tus compras o cómo funciona la tienda.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {SUGERENCIAS.map((s) => (
                      <button key={s} onClick={() => enviar(s)}
                        className="chip border border-linea bg-panel2 text-tenue transition hover:border-marca hover:text-fuerte">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((m, i) => (
                <div key={m.id} className={`flex flex-col gap-1.5 ${m.mio ? 'items-end' : 'items-start'}`}>
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.mio
                      ? 'rounded-br-md bg-marca text-sobre-marca'
                      : 'rounded-bl-md bg-panel2 text-fuerte'}`}>
                    {m.texto || <Puntos />}
                  </p>

                  {/* Los atajos esperan a que la respuesta termine de escribirse:
                      apareciendo bajo un texto a medias, saltan y distraen. */}
                  {!m.mio && m.acciones && m.acciones.length > 0 &&
                   !(enviando && i === mensajes.length - 1) && (
                    <Atajos ids={m.acciones} whatsapp={whatsapp} onIr={() => setAbierto(false)} />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-linea p-2.5">
              <div className="flex items-end gap-2 rounded-xl border border-linea bg-panel2 p-1.5 focus-within:border-marca">
                <textarea
                  ref={campo}
                  rows={1}
                  value={texto}
                  maxLength={MAX}
                  placeholder="Escribe tu pregunta…"
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(texto) }
                  }}
                  className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fuerte outline-none placeholder:text-tenue"
                />
                <button
                  onClick={() => enviar(texto)}
                  disabled={enviando || !texto.trim()}
                  aria-label="Enviar"
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-marca text-sobre-marca transition hover:brightness-110 disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Botonera bajo una respuesta, al estilo de los bots de mensajería: lleva al
 * cliente al sitio del que se acaba de hablar sin hacerle buscar el menú.
 *
 * Los destinos salen de una lista cerrada del servidor, así que un botón nunca
 * apunta a una ruta inventada.
 */
function Atajos({
  ids, whatsapp, onIr,
}: { ids: string[]; whatsapp: string; onIr: () => void }) {
  const items = ids
    .map((id) => ACCIONES.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    // El de WhatsApp solo tiene sentido si hay número configurado.
    .filter((a) => a.id !== 'whatsapp' || whatsapp)

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="flex max-w-[85%] flex-wrap gap-1.5"
    >
      {items.map((a) => {
        const Icono = ICONOS[a.icono]
        const fuera = a.id === 'whatsapp'
        const clases = 'inline-flex items-center gap-1.5 rounded-full border border-linea bg-panel px-3 py-1.5 text-xs font-medium text-fuerte transition hover:border-marca hover:text-marca'

        return fuera ? (
          <a key={a.id} href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
            className={clases}>
            <Icono size={13} className="text-marca" /> {a.txt}
          </a>
        ) : (
          <Link key={a.id} href={a.href} onClick={onIr} className={clases}>
            <Icono size={13} className="text-marca" /> {a.txt}
            <ChevronRight size={12} className="text-tenue" />
          </Link>
        )
      })}
    </motion.div>
  )
}

/** Los tres puntitos mientras la primera palabra viene en camino. */
function Puntos() {
  return (
    <span className="flex gap-1 py-1">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 animate-bounce rounded-full bg-tenue"
          style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  )
}
