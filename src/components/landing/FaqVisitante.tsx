'use client'

import { PREGUNTAS } from '@/lib/seo'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function FaqVisitante() {
  return (
    <section className="py-10 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <p className="etiqueta text-marca">Dudas Frecuentes</p>
          <h2 className="titulo mt-1.5 text-xl font-bold text-fuerte sm:text-2xl lg:text-3xl">
            Preguntas frecuentes sobre el servicio
          </h2>
          <p className="mt-1.5 text-xs text-tenue sm:text-sm md:text-base">
            Todo lo que necesitas saber antes de realizar tu primera compra de pines.
          </p>
        </div>

        <div className="mt-7 space-y-3 sm:mt-9">
          {PREGUNTAS.map(({ p, r }) => (
            <details
              key={p}
              className="tarjeta group p-4 transition-all hover:border-marca/40 open:border-marca/50 sm:p-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-fuerte">
                <div className="flex items-center gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-marca/12 text-xs font-bold text-marca">
                    ?
                  </span>
                  <h3 className="text-sm font-semibold text-fuerte transition-colors group-hover:text-marca sm:text-base">
                    {p}
                  </h3>
                </div>
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel2 text-sm font-bold text-marca transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 border-t border-linea/60 pt-3 text-xs leading-relaxed text-tenue sm:pl-9 sm:text-sm">
                {r}
              </p>
            </details>
          ))}
        </div>

        {/* CTA final al pie del FAQ */}
        <div className="tarjeta aura mt-8 p-5 text-center sm:mt-10 sm:p-7">
          <h3 className="text-base font-bold text-fuerte sm:text-xl">
            ¿Listo para conseguir tus diamantes de Free Fire?
          </h3>
          <p className="mt-1.5 text-xs text-tenue sm:text-sm">
            Crea tu cuenta en menos de 1 minuto, recarga tu saldo y recibe tu código al instante.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row sm:gap-3">
            <Link href="/registro" className="btn btn-primario w-full justify-center shadow-md sm:w-auto">
              Crear cuenta gratis <ArrowRight size={15} />
            </Link>
            <Link href="/login" className="btn btn-suave w-full justify-center sm:w-auto">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
