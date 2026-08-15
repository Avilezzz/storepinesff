'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, ShieldCheck, Wallet, ArrowRight, Gem } from 'lucide-react'
import { useSesion } from '@/lib/sesion'
import { usd } from '@/lib/format'

type Promo = {
  id: string
  imagen: string
  /** Qué parte de la imagen se conserva al recortar en pantallas anchas. */
  foco: string
  /** El arte ya trae su propio titular: encima solo va el botón. */
  soloArte?: boolean
  gancho?: string
  titulo?: string
  detalle?: string
  cta: string
  href: string
  Icono?: typeof Zap
}

/** Promesas reales del sistema. Nada de ofertas que la tienda no cumple. */
const PROMOS: Promo[] = [
  {
    id: 'vive',
    imagen: '/banner-vive.png',
    foco: 'left center',
    soloArte: true,          // el banner ya dice "Vive. Juega. Sobrevive."
    cta: 'Ver pines',
    href: '#catalogo',
  },
  {
    id: 'recarga',
    imagen: '/banner-boveda.png',
    foco: 'right center',
    gancho: 'Desde $2.00',
    titulo: 'Recarga lo que quieras',
    detalle: 'Transfiere, sube el comprobante y tu saldo queda listo.',
    cta: 'Recargar saldo',
    href: '/recargar',
    Icono: Wallet,
  },
  {
    id: 'garantia',
    imagen: '/banner-batalla.png',
    foco: 'center',
    gancho: 'Compra segura',
    titulo: 'Códigos únicos, garantizados',
    detalle: 'Si un pin falla, lo reportas y te devolvemos el saldo.',
    cta: 'Ver pines',
    href: '#catalogo',
    Icono: ShieldCheck,
  },
]

const CADA_MS = 5000

export default function HeroPromos() {
  const { uid, nombre, saldo } = useSesion()
  const pista = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(0)
  const [pausado, setPausado] = useState(false)

  // Al cliente con sesión se le habla de su saldo; al visitante, de la tienda.
  const promos: Promo[] = uid
    ? [{
        id: 'saldo',
        imagen: '/banner-boveda.png',
        foco: 'right center',
        gancho: nombre ? `Hola, ${nombre.split(' ')[0]}` : 'Tu billetera',
        titulo: saldo === null ? 'Tu saldo' : `Tienes ${usd(saldo)}`,
        detalle: saldo && saldo > 0
          ? 'Úsalo cuando quieras: los pines se entregan al instante.'
          : 'Recarga desde $2.00 y compra sin esperar a nadie.',
        cta: saldo && saldo > 0 ? 'Elegir mi recarga' : 'Recargar saldo',
        href: saldo && saldo > 0 ? '#catalogo' : '/recargar',
        Icono: Gem,
      }, ...PROMOS.filter((p) => p.id !== 'recarga')]
    : PROMOS

  const total = promos.length

  // La sesión llega después del primer render y cambia la lista de promos:
  // si el índice quedó fuera de rango, se vuelve al principio.
  useEffect(() => {
    if (activo > total - 1) irA(0)
  }, [total, activo])

  // Autoavance. Se detiene mientras el dedo o el puntero están encima para no
  // arrastrar la diapositiva bajo la mano del usuario.
  useEffect(() => {
    if (pausado || total < 2) return
    const t = setInterval(() => irA((activo + 1) % total), CADA_MS)
    return () => clearInterval(t)
  }, [activo, pausado, total])

  function irA(i: number) {
    const caja = pista.current
    if (!caja) return
    caja.scrollTo({ left: i * caja.clientWidth, behavior: 'smooth' })
    setActivo(i)
  }

  // Mantiene los puntos sincronizados cuando el usuario desliza a mano.
  function alDeslizar() {
    const caja = pista.current
    if (!caja) return
    const i = Math.round(caja.scrollLeft / caja.clientWidth)
    if (i !== activo) setActivo(i)
  }

  return (
    <section className="border-b border-linea px-4 pb-5 pt-4 sm:pb-6 sm:pt-5">
      <div className="mx-auto max-w-6xl">
        <div
          ref={pista}
          onScroll={alDeslizar}
          onPointerEnter={() => setPausado(true)}
          onPointerLeave={() => setPausado(false)}
          onTouchStart={() => setPausado(true)}
          onTouchEnd={() => setPausado(false)}
          className="sin-barra flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl"
        >
          {promos.map((p, i) => (
            <div key={p.id} className="w-full shrink-0 snap-center">
              <div className="relative h-52 overflow-hidden rounded-2xl border border-linea sm:h-72 lg:h-80">
                <Image
                  src={p.imagen}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1152px) 1152px, 100vw"
                  style={{ objectPosition: p.foco }}
                  className="object-cover"
                />

                {/* Velo desde el lado del texto: el arte de fondo es oscuro y
                    lleno de detalle, y sin esto el titular no se lee. */}
                <span aria-hidden
                  className={`absolute inset-0 ${p.soloArte
                    ? 'bg-gradient-to-t from-base/80 via-transparent to-transparent'
                    : 'bg-gradient-to-r from-base via-base/80 to-transparent'}`} />

                <div className={`relative flex h-full flex-col p-5 sm:p-7 ${
                  p.soloArte ? 'justify-end items-start' : 'justify-center'}`}>
                  {!p.soloArte && (
                    <div className="max-w-md">
                      {p.gancho && (
                        <span className="chip bg-base/70 text-marca backdrop-blur-sm">
                          {p.Icono && <p.Icono size={12} />} {p.gancho}
                        </span>
                      )}
                      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-3xl">
                        {p.titulo}
                      </h2>
                      <p className="mt-1 hidden text-sm leading-relaxed text-tenue sm:block">
                        {p.detalle}
                      </p>
                    </div>
                  )}

                  <Link href={p.href}
                    className={`btn btn-primario w-fit shadow-lg sm:px-5 sm:py-3 sm:text-base ${
                      p.soloArte ? '' : 'mt-3.5'}`}>
                    {p.cta} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {total > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {promos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => irA(i)}
                aria-label={`Ver promoción ${i + 1} de ${total}`}
                aria-current={i === activo}
                className={`h-1.5 rounded-full transition-all ${
                  i === activo ? 'w-5 bg-marca' : 'w-1.5 bg-linea hover:bg-tenue'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
