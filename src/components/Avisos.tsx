'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { X, ArrowRight, ExternalLink } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion } from '@/lib/sesion'
import { abrir as blipAviso } from '@/lib/sonido'
import { textoSobre } from '@/lib/paleta'
import { CAMPOS_AVISO, esParaMi, saleDelSitio, type Aviso } from '@/lib/avisos'

/** Páginas donde un aviso taparía justo lo que el usuario vino a hacer. */
const SIN_AVISOS = ['/login', '/registro', '/completar-perfil', '/baja', '/legal']

/**
 * Cola de avisos al entrar, como en los juegos: se muestra uno, al cerrarlo
 * entra el siguiente, y cuando se acaban no vuelven a aparecer hasta la próxima
 * vez que el usuario inicie sesión.
 *
 * La marca de "ya los vio" va en sessionStorage y lleva el id del usuario:
 * navegar por la tienda no los repite, pero cerrar sesión y entrar con otra
 * cuenta —o volver a entrar mañana— sí los muestra de nuevo.
 */
export default function Avisos() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const ruta = usePathname()
  const { uid, rol, cargando } = useSesion()

  const [cola, setCola] = useState<Aviso[]>([])
  const [i, setI] = useState(0)

  const actual = cola[i] ?? null

  useEffect(() => {
    if (cargando) return
    if (SIN_AVISOS.some((r) => ruta.startsWith(r))) return

    const clave = `ffpins:avisos:${uid ?? 'anon'}`
    try { if (sessionStorage.getItem(clave)) return } catch { return }

    let vivo = true
    void (async () => {
      // La política de lectura ya descarta lo pausado y lo fuera de fecha; aquí
      // solo queda separar lo que le toca a un cliente de lo que ve un visitante.
      const { data } = await sb.from('notices').select(CAMPOS_AVISO)
        .order('orden').order('created_at')
      if (!vivo) return

      const mios = ((data as Aviso[] | null) ?? []).filter((a) => esParaMi(a, !!uid))
      if (mios.length === 0) return

      // Se marca al abrirlos, no al terminarlos: si el usuario navega a otra
      // página a medias, la tanda no vuelve a empezar desde el principio.
      try { sessionStorage.setItem(clave, String(Date.now())) } catch {}
      setCola(mios)
      setI(0)
    })()

    return () => { vivo = false }
  }, [sb, uid, cargando, ruta])

  const cerrar = useCallback(() => {
    if (i + 1 < cola.length) {
      // Al pasar al siguiente sí suena: hubo un gesto y el navegador ya deja
      // sonar. El primero de la tanda entra callado por la misma razón.
      blipAviso()
      setI(i + 1)
    } else { setCola([]); setI(0) }
  }, [i, cola.length])

  // El aviso se le enseña al admin como a cualquiera, pero sus vistas y sus
  // clics no se cuentan: las métricas del panel son de clientes reales.
  const medir = rol !== 'ADMIN'

  // Impresión: una por aviso mostrado, y solo si de verdad se quedó en
  // pantalla. Si el registro falla, el aviso se ve igual — medir nunca puede
  // impedir que la tienda funcione.
  useEffect(() => {
    if (!actual || !medir) return
    const t = setTimeout(() => {
      void sb.rpc('fn_aviso_evento', { p_aviso_id: actual.id, p_tipo: 'VISTA' })
    }, 600)
    return () => clearTimeout(t)
  }, [sb, actual, medir])

  useEffect(() => {
    if (!actual) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [actual, cerrar])

  if (!actual) return null

  function abrir(a: Aviso) {
    // El clic se registra sin esperar respuesta: hacerlo antes de navegar
    // dejaría la apertura fuera del gesto del usuario y el navegador la
    // bloquearía como si fuera un popup.
    if (medir) void sb.rpc('fn_aviso_evento', { p_aviso_id: a.id, p_tipo: 'CLIC' })

    if (a.href) {
      if (saleDelSitio(a)) window.open(a.href, '_blank', 'noopener,noreferrer')
      else router.push(a.href)
    }
    cerrar()
  }

  const total = cola.length

  // El velo recorta: los rayos y el confeti se salen de la tarjeta a propósito,
  // y sin `overflow-hidden` asomarían por el borde de la pantalla.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={actual.titulo}
      onClick={cerrar}
      className="velo fixed inset-0 z-110 flex items-center justify-center overflow-hidden p-4"
    >
      <AnimatePresence mode="wait">
        <TarjetaAviso
          key={actual.id}
          a={actual} i={i} total={total}
          onAbrir={() => abrir(actual)}
          onCerrar={cerrar}
        />
      </AnimatePresence>
    </div>
  )
}

/** Confeti de la entrada. Las piezas son fijas y no al azar: dos aperturas
 *  seguidas deben caer igual, y un `Math.random()` en el render las recoloca
 *  en cada repintado. El color se resuelve al pintar, porque sale del arte. */
const CONFETI = Array.from({ length: 16 }, (_, i) => ({
  izq:     4 + ((i * 37) % 92),
  giro:    (i % 2 ? 1 : -1) * (200 + i * 26),
  retraso: (i % 6) * 0.05,
  caida:   230 + (i % 5) * 55,
  ancho:   i % 3 === 0 ? 10 : 6,
  tinta:   i % 4,
}))

/**
 * El aviso tal como lo ve el cliente. Se exporta para que la previa del panel
 * enseñe exactamente esto y no una imitación que se desactualiza sola.
 *
 * Está tratado como el cofre que se abre en un juego, no como un cartel de
 * página web: rayos girando detrás, confeti al aparecer, marco de degradado
 * encendido y el botón latiendo con un brillo que lo recorre. Un aviso aparece
 * sin que nadie lo pida y compite con lo que el cliente venía a hacer, así que
 * o se gana el primer segundo o se cierra sin leer.
 *
 * Pero el adorno se apaga por partes desde el panel. Un banner ya diseñado
 * trae dentro su título y su botón dibujados: encima de ese arte, el marco y
 * el texto de la tienda solo estorban. Con todo apagado queda la imagen sola,
 * que se toca entera para ir al enlace.
 */
export function TarjetaAviso({
  a, i, total, onAbrir, onCerrar,
}: {
  a: Aviso
  i: number
  total: number
  onAbrir: () => void
  onCerrar: () => void
}) {
  const quieto = useReducedMotion()
  const externo = saleDelSitio(a)

  // El arte se toca cuando no hay botón que tocar. Es la única forma de que un
  // aviso de solo imagen pueda llevar a algún sitio.
  const arteClicable = !!a.href && !a.con_boton
  const conPie = a.con_titulo || a.con_boton

  // Los colores salen de la propia imagen, calculados al subirla. Si el arte no
  // tenía color que sacar —blanco y negro— manda la marca de la tienda.
  const A = a.color_a ?? 'var(--color-marca)'
  const B = a.color_b ?? 'var(--color-marca2)'
  const TINTAS = [A, B, '#ffd27d', '#ffffff']

  return (
    <motion.div
      initial={quieto ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 26 }}
      animate={quieto ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      exit={quieto ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -10 }}
      transition={quieto
        ? { duration: 0.2 }
        : { type: 'spring', stiffness: 320, damping: 21, mass: 0.9 }}
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-sm sm:max-w-md"
    >
      {/* Rayos de sol girando detrás de la tarjeta: el fondo de los cofres y las
          tiradas de premio de toda la vida. Un gradiente cónico repetido sale
          más barato que dieciséis triángulos, y la máscara redonda evita que se
          vean los cortes en las esquinas. */}
      {a.con_marco && !quieto && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[190%] w-[190%]
            -translate-x-1/2 -translate-y-1/2 opacity-30"
          style={{
            background:
              `repeating-conic-gradient(from 0deg, ${A} 0deg 5deg, transparent 5deg 17deg)`,
            maskImage: 'radial-gradient(circle, #000 8%, transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle, #000 8%, transparent 62%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
        />
      )}

      {/* El confeti cae por delante del marco, así que va fuera del recorte. */}
      {a.con_marco && !quieto && CONFETI.map((c, n) => (
        <motion.span
          key={n}
          aria-hidden
          className="pointer-events-none absolute top-0 rounded-[1px]"
          style={{ left: `${c.izq}%`, width: c.ancho, height: c.ancho * 1.6, background: TINTAS[c.tinta] }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: c.caida, opacity: 0, rotate: c.giro }}
          transition={{ duration: 1.5, delay: 0.1 + c.retraso, ease: 'easeIn' }}
        />
      ))}

      {/* Con marco: degradado de 2px y resplandor propio, para que la tarjeta
          parezca encendida sobre el velo. Sin marco: la imagen y nada más. */}
      <div
        className={a.con_marco ? 'rounded-3xl p-[2px]' : 'rounded-2xl'}
        style={a.con_marco ? {
          background: `linear-gradient(140deg, ${A}, ${B} 55%, color-mix(in srgb, ${A} 35%, transparent))`,
          boxShadow: `0 0 70px -16px ${A}, 0 22px 50px -20px rgb(0 0 0 / 0.8)`,
        } : { boxShadow: '0 22px 50px -20px rgb(0 0 0 / 0.8)' }}
      >
        <div className={`overflow-hidden bg-panel ${a.con_marco ? 'rounded-[1.35rem]' : 'rounded-2xl'}`}>
          {/* El arte manda. Va sobre fondo oscuro y sin recortar: un banner
              publicitario suele traer texto en los bordes, y `cover` se lo
              comería en cuanto la pantalla no tuviera la proporción exacta. */}
          <div
            onClick={arteClicable ? onAbrir : undefined}
            onKeyDown={arteClicable
              ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } }
              : undefined}
            role={arteClicable ? 'link' : undefined}
            tabIndex={arteClicable ? 0 : undefined}
            aria-label={arteClicable ? a.titulo : undefined}
            className={`relative aspect-4/5 w-full bg-[#080a0e] sm:aspect-16/10
              ${arteClicable ? 'cursor-pointer' : ''}`}
          >
            <Image
              src={(esMovil() && a.imagen_movil_url) || a.imagen_url}
              alt={a.titulo}
              fill
              priority
              sizes="(min-width: 640px) 448px, 92vw"
              className="object-contain"
            />

            {/* Un destello recorre el arte una vez, como el brillo de una carta
                al girarla. */}
            {a.con_marco && !quieto && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12
                  bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: '-160%' }}
                animate={{ x: '460%' }}
                transition={{ duration: 1.2, delay: 0.35, ease: 'easeInOut' }}
              />
            )}

            {total > 1 && (
              <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1
                text-[11px] font-bold tabular-nums text-white backdrop-blur-sm">
                {i + 1} / {total}
              </span>
            )}

            <button
              onClick={onCerrar}
              aria-label="Cerrar aviso"
              className="absolute right-2.5 top-2.5 rounded-full bg-black/60 p-2 text-white
                backdrop-blur-sm transition hover:bg-black/80"
            >
              <X size={17} />
            </button>
          </div>

          {/* Sin título y sin botón no hay pie que pintar: la tarjeta termina
              en la imagen, y para cerrar o pasar al siguiente está la X. */}
          {conPie && (
            <div className="flex flex-col gap-3 px-4 pb-4 pt-4">
              {a.con_titulo && <h2 className="titulo text-balance text-center">{a.titulo}</h2>}

              {/* El botón late despacio y un brillo lo cruza cada pocos
                  segundos: es lo que separa un enlace de una recompensa que hay
                  que reclamar. El pulso vive en el envoltorio para no pelearse
                  con el `hover` del propio botón. */}
              {a.con_boton && (
                <motion.div
                  animate={quieto ? undefined : { scale: [1, 1.028, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <button
                    onClick={a.href ? onAbrir : onCerrar}
                    className="btn btn-primario relative w-full overflow-hidden py-3 text-[0.95rem] font-semibold"
                    // El botón también se tiñe del arte. El color del texto no
                    // se elige a ojo: se calcula cuál de los dos, blanco o
                    // negro, contrasta más, porque sobre un amarillo sacado de
                    // una imagen el blanco de siempre no se leería.
                    style={a.color_a ? {
                      background: `linear-gradient(120deg, ${a.color_a}, ${a.color_b ?? a.color_a})`,
                      color: textoSobre(a.color_a),
                      borderColor: 'transparent',
                    } : undefined}
                  >
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {a.href ? (a.cta || 'Ver más') : 'Entendido'}
                      {a.href && (externo ? <ExternalLink size={15} /> : <ArrowRight size={15} />)}
                    </span>

                    {!quieto && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 w-1/4 -skew-x-12 bg-white/35"
                        initial={{ x: '-180%' }}
                        animate={{ x: '520%' }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.9, ease: 'easeInOut' }}
                      />
                    )}
                  </button>
                </motion.div>
              )}

              <button onClick={onCerrar} className="text-xs text-tenue transition hover:text-fuerte">
                {i + 1 < total ? 'Siguiente' : 'Cerrar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/** Se consulta al pintar, no en un efecto: el arte correcto desde el primer
 *  fotograma evita que la imagen salte al cargar la versión de teléfono. */
const esMovil = () => typeof window !== 'undefined' && window.innerWidth < 640
