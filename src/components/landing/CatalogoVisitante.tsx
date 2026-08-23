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

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4">
          {productos.map((p, idx) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3), ease: 'easeOut' }}
              className="tarjeta group flex flex-col overflow-hidden transition-all hover:border-marca/40"
            >
              <div className="relative">
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={idx < 4}
                  iconoSize={36}
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 32vw, 46vw"
                  zoom
                  className="aspect-4/5 w-full"
                />

                <span className="chip absolute left-1.5 top-1.5 bg-base/85 text-[10px] font-semibold text-ok backdrop-blur-sm sm:left-2 sm:top-2 sm:text-xs">
                  {p.stock_disponible > 0 ? 'Disponible' : 'Agotado'}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-end gap-2 p-2.5 sm:gap-2.5 sm:p-3">
                <div className="flex items-baseline justify-between gap-1.5">
                  <p className="cifra text-base font-bold text-marca sm:text-xl">
                    {usd(p.precio_cents)}
                  </p>
                  <p className="cifra text-[10px] font-medium text-fuerte sm:text-xs">
                    {p.diamantes.toLocaleString('es-EC')} 💎
                  </p>
                </div>

                <Link
                  href={`/registro`}
                  className="btn btn-primario w-full py-1.5 text-xs font-semibold sm:py-2 sm:text-sm"
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
