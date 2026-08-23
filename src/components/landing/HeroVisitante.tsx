'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShieldCheck, Zap, Landmark, Gem } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'

const METRICAS = [
  { icono: Zap, etiqueta: 'Entrega digital', valor: '< 1 minuto' },
  { icono: ShieldCheck, etiqueta: 'Seguridad', valor: 'Sin contraseñas' },
  { icono: Landmark, etiqueta: 'Bancos', valor: 'Pichincha / Guayaquil' },
]

export default function HeroVisitante() {
  const seccionRef = useRef<HTMLDivElement>(null)

  // Efecto Parallax en el fondo usando useScroll de motion/react
  const { scrollYProgress } = useScroll({
    target: seccionRef,
    offset: ['start start', 'end start'],
  })

  // Desplazamiento y escala suave para profundidad visual
  const yParallax = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const escalaParallax = useTransform(scrollYProgress, [0, 1], [1, 1.06])
  const opacidadTexto = useTransform(scrollYProgress, [0, 0.7], [1, 0.2])

  return (
    <section
      ref={seccionRef}
      className="relative min-h-[480px] overflow-hidden border-b border-linea py-10 sm:min-h-[540px] sm:py-16 lg:min-h-[580px] lg:py-20"
    >
      {/* CAPA DE FONDO PANORÁMICO CON EFECTO PARALLAX */}
      <motion.div
        style={{ y: yParallax, scale: escalaParallax }}
        className="pointer-events-none absolute inset-0 -z-20 h-[120%] w-full"
      >
        <Image
          src="/mascota-hero-wide.jpg"
          alt="FFPINS Mascota Retro Pixel Art"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right sm:object-center"
        />

        {/* Gradientes cinematográficos para asegurar máxima legibilidad de los textos en PC y móvil */}
        {/* Gradiente izquierdo para zona de texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a10]/95 via-[#070a10]/85 to-transparent" />
        {/* Gradiente vertical para fundir con la barra y sección inferior */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070a10]/70 via-transparent to-[#070a10]" />
      </motion.div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          style={{ opacity: opacidadTexto }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl lg:max-w-3xl"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl lg:leading-[1.15]">
            Diamantes Free Fire con entrega digital inmediata
          </h1>

          <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base lg:text-lg">
            Recarga saldo por transferencia bancaria en Banco Pichincha o Guayaquil y obtén
            tus códigos oficiales al instante, sin compartir tu ID ni contraseñas.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3.5">
            <Link
              href="/registro"
              className="btn btn-primario w-full justify-center shadow-lg shadow-orange-500/25 sm:w-auto"
            >
              Crear cuenta gratis <ArrowRight size={16} />
            </Link>
            <a
              href="#pines"
              className="btn w-full justify-center border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:w-auto"
            >
              Ver pines disponibles
            </a>
            <Link
              href="/login"
              className="enlace justify-center text-xs font-semibold text-slate-300 hover:text-white sm:justify-start sm:text-sm"
            >
              ¿Ya tienes cuenta? Ingresar
            </Link>
          </div>

          {/* Tarjetas HUD de métricas con efecto Glassmorphic */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:mt-10 sm:gap-3">
            {METRICAS.map(({ icono: Icono, etiqueta, valor }, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-black/45 p-2.5 backdrop-blur-md transition hover:border-cyan-400/40 sm:p-3"
              >
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Icono size={14} />
                  <span className="text-[10px] uppercase tracking-wider text-slate-300 sm:text-[11px]">
                    {etiqueta}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-white sm:text-sm">
                  {valor}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
