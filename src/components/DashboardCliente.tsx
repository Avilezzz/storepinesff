'use client'

import Link from 'next/link'
import { Wallet, Plus, Package, ShoppingCart, ExternalLink, Sparkles } from 'lucide-react'
import { useSesion } from '@/lib/sesion'
import { usd } from '@/lib/format'

export default function DashboardCliente() {
  const { nombre, saldo, items } = useSesion()
  const primerNombre = nombre ? nombre.split(' ')[0] : 'Cliente'

  return (
    <div className="border-b border-linea bg-panel/60 py-4 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-marca" />
              <h1 className="text-lg font-semibold text-fuerte sm:text-xl">
                Hola, {primerNombre}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-tenue">
              Tu tienda automatizada de pines Free Fire. Elige tu recarga y recibe tu código.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/billetera"
              className="inline-flex items-center gap-2 rounded-lg border border-linea bg-panel px-3 py-1.5 text-sm transition hover:border-marca/40"
            >
              <Wallet size={15} className="text-marca" />
              <span className="text-xs text-tenue">Saldo:</span>
              <span className="cifra font-semibold text-fuerte">
                {saldo === null ? '—' : usd(saldo)}
              </span>
            </Link>

            <Link href="/recargar" className="btn btn-primario py-1.5 text-xs font-semibold sm:text-sm">
              <Plus size={14} /> Recargar
            </Link>

            <Link href="/mis-compras" className="btn btn-suave py-1.5 text-xs sm:text-sm">
              <Package size={14} /> Mis compras
            </Link>

            {items > 0 && (
              <Link href="/carrito" className="btn btn-suave relative py-1.5 text-xs sm:text-sm">
                <ShoppingCart size={14} /> Carrito ({items})
              </Link>
            )}

            <a
              href="https://reward.ff.garena.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-suave hidden py-1.5 text-xs text-tenue hover:text-fuerte md:inline-flex"
            >
              Portal Garena <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
