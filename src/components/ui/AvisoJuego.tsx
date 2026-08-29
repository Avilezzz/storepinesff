'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { X, Sparkles, Coins, Zap, TriangleAlert, type LucideIcon } from 'lucide-react'
import { fanfarria } from '@/lib/sonido'

/**
 * El aviso que salta cuando algo le pasa a la cuenta del cliente: el pin
 * entregado, el saldo acreditado, el pin que vuelve al stock.
 *
 * Está hecho como el cartel de "logro desbloqueado" de un videojuego, no como
 * el mensajito gris de siempre: entra dando un golpe, suelta chispas, un
 * destello lo recorre y una barra enseña cuánto le queda en pantalla. La razón
 * no es el adorno: estos avisos llegan solos, sin que el cliente haya tocado
 * nada, así que tienen que ganarse la mirada en el primer segundo o se pierden.
 *
 * El panel es oscuro en los dos temas a propósito, igual que la cabecera de los
 * correos: el color de la marca brilla sobre negro, y encima del fondo claro de
 * la tienda destaca como una pieza aparte.
 */
export type TipoAviso = 'compra' | 'premio' | 'stock' | 'alerta'

const ESTILO: Record<TipoAviso, {
  etiqueta: string; Icono: LucideIcon; claro: string; vivo: string; chispas: boolean
}> = {
  compra: { etiqueta: 'Entregado',   Icono: Sparkles,      claro: '#ffd27d', vivo: '#ff7a18', chispas: true  },
  premio: { etiqueta: 'Saldo nuevo', Icono: Coins,         claro: '#86efac', vivo: '#16a34a', chispas: true  },
  stock:  { etiqueta: 'Disponible',  Icono: Zap,           claro: '#7dd3fc', vivo: '#0284c7', chispas: true  },
  alerta: { etiqueta: 'Atención',    Icono: TriangleAlert, claro: '#fcd34d', vivo: '#dc2626', chispas: false },
}

/** Ocho chispas repartidas en círculo. Fijas y no al azar: dos avisos seguidos
 *  deben verse iguales, y un `Math.random()` aquí solo añade nervio. */
const CHISPAS = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8)

const DURACION = 5200

/** Lanza el aviso. Se llama desde cualquier sitio, como `toast()`. */
export function avisar(a: {
  tipo: TipoAviso; titulo: string; cuerpo?: string | null; url?: string | null
}) {
  toast.custom((id) => <AvisoJuego id={id} {...a} />, {
    duration: DURACION,
    // Sin la carcasa de sonner: el marco, el fondo y la sombra los pone el
    // componente, que los necesita a su medida para el degradado del borde.
    unstyled: true,
    style: { background: 'none', border: 0, boxShadow: 'none', padding: 0, width: '100%' },
  })
}

function AvisoJuego({ id, tipo, titulo, cuerpo, url }: {
  id: string | number
  tipo: TipoAviso
  titulo: string
  cuerpo?: string | null
  url?: string | null
}) {
  const router = useRouter()
  const quieto = useReducedMotion()
  const { etiqueta, Icono, claro, vivo, chispas } = ESTILO[tipo]

  // Suena una vez, al aparecer. El navegador solo deja sonar si el usuario ya
  // tocó algo en la página; si no, el aviso entra mudo y no pasa nada.
  useEffect(() => { fanfarria(tipo) }, [tipo])

  const ir = () => {
    toast.dismiss(id)
    if (url) router.push(url)
  }

  return (
    <motion.div
      className="relative w-full"
      initial={quieto ? { opacity: 0 } : { opacity: 0, y: -26, scale: 0.82 }}
      animate={quieto ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={quieto ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.9 }}
      transition={quieto ? { duration: 0.2 } : { type: 'spring', stiffness: 480, damping: 19, mass: 0.7 }}
    >
      {/* Las chispas salen del medallón y viven fuera del marco, que recorta. */}
      {chispas && !quieto && CHISPAS.map((angulo, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-[2.05rem] top-1/2 h-1.5 w-1.5 rounded-full"
          style={{ background: i % 2 ? claro : '#ffffff' }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos(angulo) * 44,
            y: Math.sin(angulo) * 44,
            scale: 0.2,
          }}
          transition={{ duration: 0.75, delay: 0.08, ease: 'easeOut' }}
        />
      ))}

      {/* El borde es un degradado, así que va como fondo de un marco de 1px. */}
      <div className="rounded-2xl p-px shadow-[0_14px_38px_-12px_rgb(0_0_0/0.75)]"
        style={{ background: `linear-gradient(135deg, ${claro}, ${vivo} 45%, rgb(255 255 255 / 0.08) 100%)` }}>
        <div
          onClick={url ? ir : undefined}
          onKeyDown={url ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir() } } : undefined}
          role={url ? 'link' : undefined}
          tabIndex={url ? 0 : undefined}
          className={`relative overflow-hidden rounded-[0.9rem] bg-[#0b0e15] px-3.5 py-3
            ${url ? 'cursor-pointer' : ''}`}
          style={{ backgroundImage: `radial-gradient(22rem 8rem at 0% 0%, ${vivo}2e, transparent 70%)` }}
        >
          {/* Destello que recorre el cartel una sola vez, como el brillo de una
              carta de colección al girarla. */}
          {!quieto && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12
                bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-160%' }}
              animate={{ x: '460%' }}
              transition={{ duration: 1.1, delay: 0.18, ease: 'easeInOut' }}
            />
          )}

          <div className="relative flex items-center gap-3">
            <motion.span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
              style={{
                background: `linear-gradient(150deg, ${claro}, ${vivo})`,
                boxShadow: `0 0 20px -3px ${vivo}`,
              }}
              initial={quieto ? false : { scale: 0.5, rotate: -18 }}
              animate={quieto ? false : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 620, damping: 14, delay: 0.05 }}
            >
              <Icono size={21} strokeWidth={2.4} className="text-[#0b0e15]" />
            </motion.span>

            <div className="min-w-0 flex-1">
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em]"
                style={{ color: claro }}>
                {etiqueta}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white">{titulo}</p>
              {cuerpo && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#aab2c0]">{cuerpo}</p>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); toast.dismiss(id) }}
              aria-label="Cerrar aviso"
              className="-mr-1 shrink-0 self-start rounded-lg p-1 text-[#7b8494] transition hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Cuánto le queda en pantalla. Se vacía sola en el tiempo exacto que
              dura el toast, así el cliente ve que va a desaparecer. */}
          <motion.span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left"
            style={{ background: `linear-gradient(90deg, ${claro}, ${vivo})` }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: DURACION / 1000, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
