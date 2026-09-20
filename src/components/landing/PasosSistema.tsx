'use client'

import { Landmark, Wallet, Zap, ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'

const PASOS = [
  {
    n: 1,
    icono: Landmark,
    titulo: 'Transfiere a nuestras cuentas',
    descripcion:
      'Crea tu cuenta gratis y transfiere desde $5.00 a Banco Pichincha o Banco Guayaquil. Sube tu comprobante de pago.',
    detalle: 'Sin tarjeta de crédito',
  },
  {
    n: 2,
    icono: Wallet,
    titulo: 'Saldo listo en tu billetera',
    descripcion:
      'Verificamos el comprobante y acreditamos tu saldo en dólares exactos. Tu dinero queda disponible para cuando lo necesites.',
    detalle: 'Auditoría inmutable',
  },
  {
    n: 3,
    icono: Zap,
    titulo: 'Recibe tu código y canjea',
    descripcion:
      'Elige el paquete de diamantes que prefieras. El código de 16 dígitos se despliega de inmediato en tu pantalla.',
    detalle: 'Entrega en 1 clic',
  },
]

export default function PasosSistema() {
  return (
    <section className="border-b border-linea py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="etiqueta text-marca">Proceso Simple y Transparente</p>
          <h2 className="titulo mt-1.5 text-xl font-bold text-fuerte sm:text-2xl lg:text-3xl">
            Cómo funciona el sistema en 3 pasos
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-tenue sm:text-sm md:text-base">
            Diseñado para ser rápido, seguro y sin intermediarios manuales al momento de entregar tu código.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {PASOS.map((paso, idx) => {
            const Icono = paso.icono
            return (
              <motion.div
                key={paso.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: idx * 0.1, ease: 'easeOut' }}
                className="tarjeta relative flex flex-col justify-between p-4.5 transition-all hover:border-marca/40 sm:p-6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="cifra grid h-7 w-7 place-items-center rounded-lg bg-panel2 text-xs font-bold text-marca sm:h-8 sm:w-8 sm:text-sm">
                      0{paso.n}
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 text-marca sm:h-9 sm:w-9">
                      <Icono size={17} />
                    </span>
                  </div>

                  <h3 className="subtitulo mt-3.5 text-sm font-semibold text-fuerte sm:text-base">
                    {paso.titulo}
                  </h3>

                  <p className="mt-1.5 text-xs leading-relaxed text-tenue sm:text-sm">
                    {paso.descripcion}
                  </p>
                </div>

                <div className="mt-4 border-t border-linea pt-2.5 sm:mt-5 sm:pt-3">
                  <span className="text-[11px] font-medium text-fuerte">
                    ✓ {paso.detalle}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-7 flex justify-center sm:mt-8">
          <Link href="/registro" className="enlace gap-1.5 text-xs font-semibold text-marca sm:text-sm">
            Comenzar ahora creando tu cuenta <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
