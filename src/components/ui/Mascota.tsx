'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'

/**
 * La mascota de FFPINS, recortada de la hoja de personaje.
 *
 * Cada estado del asistente tiene su gesto: así el cliente sabe si le están
 * escribiendo o si ya terminó sin necesidad de leer ningún cartel.
 */
export type Gesto = 'reposo' | 'pensando' | 'listo' | 'saludo'

const CARA: Record<Gesto, { src: string; alt: string }> = {
  reposo:   { src: '/mascota/neutral.png',  alt: 'Asistente de FFPINS' },
  pensando: { src: '/mascota/enfocado.png', alt: 'Asistente pensando' },
  listo:    { src: '/mascota/guino.png',    alt: 'Asistente guiñando' },
  saludo:   { src: '/mascota/feliz.png',    alt: 'Asistente saludando' },
}

export default function Mascota({
  gesto = 'reposo', tam = 32, halo = false, className = '',
}: {
  gesto?: Gesto
  tam?: number
  /** Aura que late alrededor mientras el asistente está trabajando. */
  halo?: boolean
  className?: string
}) {
  const { src, alt } = CARA[gesto]

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: tam, height: tam }}
    >
      {halo && (
        <motion.span
          aria-hidden
          className="absolute -inset-1 rounded-full bg-[#2ea6ff]/35 blur-[6px]"
          animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.94, 1.06, 0.94] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        />
      )}

      {/* El cambio de gesto va con fundido para que no parpadee al alternar. */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={gesto}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0"
        >
          <Image src={src} alt={alt} width={tam} height={tam} className="size-full" priority />
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
