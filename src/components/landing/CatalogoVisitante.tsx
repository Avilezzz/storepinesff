'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import type { Producto } from '@/components/Catalogo'
import { usd } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'

export default function CatalogoVisitante({ productos }: { productos: Producto[] }) {
  return (
    <section id="pines" className="scroll-mt-16 border-b border-linea py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="etiqueta text-marca">Catálogo Oficial</p>
            <h2 className="titulo mt-1 text-xl font-bold text-fuerte sm:text-2xl lg:text-3xl">
              Pines de diamantes disponibles
            </h2>
            <p className="mt-1.5 text-xs text-tenue sm:text-sm">
              Precios transparentes en dólares ($ USD). Recarga tu billetera y adquiere tus pines con 1 clic.
            </p>
          </div>
          <Link href="/registro" className="btn btn-suave shrink-0 text-xs sm:text-sm">
            <Sparkles size={14} className="text-marca" /> Registrarme para comprar
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-2 md:gap-4">
          {productos.map((p, idx) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3), ease: 'easeOut' }}
              className="tarjeta group flex min-h-36 overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:border-marca/45 hover:shadow-lg sm:p-2.5"
            >
              <div className="relative w-28 shrink-0 overflow-hidden rounded-xl border border-linea bg-panel2 sm:w-32">
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={idx < 4}
                  iconoSize={36}
                  sizes="128px"
                  zoom
                  className="h-full min-h-32 w-full rounded-xl"
                />

                {p.stock_disponible <= 0 && (
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-error/90 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-white shadow-lg">
                    Agotado
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-3 py-2 sm:px-4">
                <div>
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-fuerte sm:text-base">{p.nombre}</h3>
                  <p className={`cifra mt-1 text-xs font-semibold ${p.stock_disponible > 0 ? 'text-ok' : 'text-error'}`}>
                    Stock: {p.stock_disponible}
                  </p>
                  <p className="cifra mt-1 text-2xl font-bold text-marca">{usd(p.precio_cents)}</p>
                </div>

                <Link
                  href={`/registro`}
                  className="btn btn-primario w-full py-2 text-xs font-semibold sm:text-sm"
                >
                  Comprar pin <ArrowRight size={13} />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>

        {productos.length === 0 && (
          <p className="py-10 text-center text-xs text-tenue sm:text-sm">
            Pronto publicaremos nuevos paquetes de diamantes.
          </p>
        )}
      </div>
    </section>
  )
}
