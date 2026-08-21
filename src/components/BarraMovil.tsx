'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, ShoppingCart, Wallet, Package, Settings } from 'lucide-react'
import { useSesion } from '@/lib/sesion'

/**
 * Navegación fija inferior, solo en móvil. Es donde el pulgar llega sin
 * esfuerzo, y la mayor parte del tráfico de esta tienda llega desde el celular.
 */
export default function BarraMovil() {
  const ruta = usePathname()
  const { uid, rol, items } = useSesion()

  if (!uid || ruta === '/login' || ruta === '/registro') return null

  const tabs = [
    { href: '/', txt: 'Tienda', Icono: Store },
    { href: '/carrito', txt: 'Carrito', Icono: ShoppingCart, n: items },
    { href: '/mis-compras', txt: 'Compras', Icono: Package },
    { href: '/billetera', txt: 'Saldo', Icono: Wallet },
    ...(rol === 'ADMIN' ? [{ href: '/admin', txt: 'Admin', Icono: Settings }] : []),
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      <div className="flex">
        {tabs.map(({ href, txt, Icono, n }) => {
          const activo = href === '/' ? ruta === '/' : ruta.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                activo ? 'text-marca' : 'text-tenue'}`}>
              <span className="relative">
                <Icono size={20} strokeWidth={activo ? 2.4 : 1.9} />
                {!!n && n > 0 && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-marca px-1 text-[10px] font-bold text-sobre-marca">
                    {n}
                  </span>
                )}
              </span>
              {txt}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
