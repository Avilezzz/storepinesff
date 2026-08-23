'use client'

import Image from 'next/image'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function BancosConfianza() {
  return (
    <section className="border-b border-linea py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="tarjeta overflow-hidden p-5 sm:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 text-ok">
                <ShieldCheck size={18} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-ok sm:text-xs">
                  Métodos de Pago Nacionales
                </span>
              </div>

              <h2 className="titulo mt-1.5 text-xl font-bold text-fuerte sm:text-2xl lg:text-3xl">
                Transfiere fácil desde tu banco en Ecuador
              </h2>

              <p className="mt-2 text-xs leading-relaxed text-tenue sm:text-sm md:text-base">
                Aceptamos transferencias directas, interbancarias y depósitos en los dos principales
                bancos del país. Sin recargos por tarjeta ni comisiones ocultas.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-fuerte">
                  <CheckCircle2 size={14} className="text-ok shrink-0" />
                  <span>Recargas desde $2.00 USD</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-fuerte">
                  <CheckCircle2 size={14} className="text-ok shrink-0" />
                  <span>Acreditación rápida con comprobante</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-fuerte">
                  <CheckCircle2 size={14} className="text-ok shrink-0" />
                  <span>Sin costo adicional por transacción</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-fuerte">
                  <CheckCircle2 size={14} className="text-ok shrink-0" />
                  <span>Saldo disponible para compras en 1 clic</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:col-span-5">
              <div className="flex flex-col items-center justify-center rounded-xl border border-linea bg-panel2 p-4 text-center transition hover:border-marca/30 sm:p-5">
                <div className="relative flex h-11 w-full max-w-[120px] items-center justify-center rounded-lg bg-white/95 p-1.5 shadow-xs">
                  <Image
                    src="/Banco_Pichincha_logo.png"
                    alt="Banco Pichincha"
                    width={100}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <p className="mt-2.5 text-xs font-bold text-fuerte">Banco Pichincha</p>
                <p className="text-[10px] text-tenue sm:text-[11px]">Directo / DeUna / Mi Vecino</p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-linea bg-panel2 p-4 text-center transition hover:border-marca/30 sm:p-5">
                <div className="relative flex h-11 w-full max-w-[120px] items-center justify-center rounded-lg bg-white/95 p-1.5 shadow-xs">
                  <Image
                    src="/Banco_Guayaquil_logo.png"
                    alt="Banco Guayaquil"
                    width={100}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <p className="mt-2.5 text-xs font-bold text-fuerte">Banco Guayaquil</p>
                <p className="text-[10px] text-tenue sm:text-[11px]">Directo / Banco del Barrio</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
