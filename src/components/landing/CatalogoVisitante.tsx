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

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {productos.map((p, idx) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3), ease: 'easeOut' }}
              className="tarjeta group flex flex-col overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:border-marca/45 hover:shadow-lg sm:p-2.5"
            >
              <div className="relative overflow-hidden rounded-xl border border-linea bg-panel2">
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={idx < 4}
                  iconoSize={36}
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 32vw, 46vw"
                  zoom
                  className="aspect-4/5 w-full rounded-xl"
                />

                <span className={`chip absolute left-2 top-2 border bg-base/85 text-[10px] font-semibold backdrop-blur-md sm:text-xs ${
                  p.stock_disponible > 0 ? 'border-linea/70 text-ok' : 'border-error/40 text-error'}`}>
                  {p.stock_disponible > 0 ? 'Disponible' : 'Agotado'}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-end gap-2.5 px-1 pb-1 pt-3 sm:px-1.5">
                <p className="cifra text-center text-xl font-bold text-marca sm:text-2xl">
                  {usd(p.precio_cents)}
                </p>

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
