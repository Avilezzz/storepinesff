'use client'

import { ShieldCheck, Zap, Lock, RefreshCw } from 'lucide-react'
import { motion } from 'motion/react'

const BENEFICIOS = [
  {
    icono: Lock,
    titulo: 'Cero riesgos · Sin contraseñas de juego',
    descripcion:
      'A diferencia de recargas por ID donde debes compartir accesos, aquí compras códigos oficiales de canje. Tu cuenta de Free Fire nunca pasa por manos de terceros.',
  },
  {
    icono: Zap,
    titulo: 'Entrega automatizada sin esperas',
    descripcion:
      'Una vez acreditado tu saldo, la compra es instantánea. El sistema asigna el pin en milisegundos directamente en tu pantalla y en tu historial.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Billetera digital respaldada',
    descripcion:
      'Tu dinero se contabiliza de forma exacta en centavos de dólar con un libro mayor inmutable. Sin comisiones ocultas ni cobros sorpresa.',
  },
  {
    icono: RefreshCw,
    titulo: 'Garantía y soporte directo',
    descripcion:
      'Si un código presenta cualquier inconveniente de canje, puedes abrir un reclamo con 1 clic desde tu panel para revisión y reposición inmediata.',
  },
]

export default function BeneficiosSistema() {
  return (
    <section className="border-b border-linea py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="etiqueta text-marca">Ventajas del Sistema</p>
          <h2 className="titulo mt-1.5 text-xl font-bold text-fuerte sm:text-2xl lg:text-3xl">
            Por qué recargar con nuestro sistema
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-tenue sm:text-sm md:text-base">
            Una plataforma construida pensando en la seguridad de tu cuenta y la rapidez de cada compra.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
          {BENEFICIOS.map((b, idx) => {
            const Icono = b.icono
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: idx * 0.08, ease: 'easeOut' }}
                className="tarjeta flex gap-3.5 p-4 transition-all hover:border-marca/40 sm:gap-4 sm:p-5"
              >
                <div className="shrink-0">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-panel2 text-marca sm:h-10 sm:w-10">
                    <Icono size={18} />
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-fuerte sm:text-base">{b.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-tenue sm:text-sm">
                    {b.descripcion}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
