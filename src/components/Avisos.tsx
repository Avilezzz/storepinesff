'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowRight, ExternalLink } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion } from '@/lib/sesion'
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
    if (i + 1 < cola.length) setI(i + 1)
    else { setCola([]); setI(0) }
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={actual.titulo}
      onClick={cerrar}
      className="velo fixed inset-0 z-110 flex items-center justify-center p-4"
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

/**
 * El aviso tal como lo ve el cliente. Se exporta para que la previa del panel
 * enseñe exactamente esto y no una imitación que se desactualiza sola.
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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      className="tarjeta w-full max-w-sm overflow-hidden border-marca/30 shadow-2xl sm:max-w-md"
    >
      {/* El arte manda. Va sobre fondo oscuro y sin recortar: un banner
          publicitario suele traer texto en los bordes, y `cover` se lo comería
          en cuanto la pantalla no tuviera la proporción exacta. */}
      <div className="relative aspect-4/5 w-full bg-[#080a0e] sm:aspect-16/10">
        <Image
          src={(esMovil() && a.imagen_movil_url) || a.imagen_url}
          alt={a.titulo}
          fill
          priority
          sizes="(min-width: 640px) 448px, 92vw"
          className="object-contain"
        />

        {total > 1 && (
          <span className="chip absolute left-2 top-2 bg-black/55 font-medium text-white backdrop-blur-sm">
            {i + 1} / {total}
          </span>
        )}

        <button
          onClick={onCerrar}
          aria-label="Cerrar aviso"
          className="absolute right-2 top-2 rounded-lg bg-black/55 p-2 text-white backdrop-blur-sm transition hover:bg-black/75"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h2 className="subtitulo text-center">{a.titulo}</h2>

        {a.href ? (
          <button onClick={onAbrir} className="btn btn-primario w-full py-2.5">
            {a.cta || 'Ver más'}
            {saleDelSitio(a) ? <ExternalLink size={15} /> : <ArrowRight size={15} />}
          </button>
        ) : (
          <button onClick={onCerrar} className="btn btn-primario w-full py-2.5">Entendido</button>
        )}

        <button onClick={onCerrar} className="text-xs text-tenue transition hover:text-fuerte">
          {i + 1 < total ? 'Siguiente' : 'Cerrar'}
        </button>
      </div>
    </motion.div>
  )
}

/** Se consulta al pintar, no en un efecto: el arte correcto desde el primer
 *  fotograma evita que la imagen salte al cargar la versión de teléfono. */
const esMovil = () => typeof window !== 'undefined' && window.innerWidth < 640
