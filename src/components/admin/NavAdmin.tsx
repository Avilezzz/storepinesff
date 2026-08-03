'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Landmark, KeyRound, Gem, AlertTriangle, Users } from 'lucide-react'

const SECCIONES = [
  { href: '/admin', txt: 'Resumen', Icono: LayoutDashboard },
  { href: '/admin/recargas', txt: 'Recargas', Icono: Landmark },
  { href: '/admin/codigos', txt: 'Pines', Icono: KeyRound },
  { href: '/admin/productos', txt: 'Productos', Icono: Gem },
  { href: '/admin/reclamos', txt: 'Reclamos', Icono: AlertTriangle },
  { href: '/admin/usuarios', txt: 'Usuarios', Icono: Users },
]

/** En móvil las pestañas se deslizan en horizontal en vez de romper el diseño. */
export default function NavAdmin() {
  const ruta = usePathname()

  return (
    <div className="sin-barra -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-linea px-4 pb-2.5">
      {SECCIONES.map(({ href, txt, Icono }) => {
        const activo = href === '/admin' ? ruta === '/admin' : ruta.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
              activo ? 'bg-panel2 font-medium text-white' : 'text-tenue hover:text-white'}`}>
            <Icono size={15} className={activo ? 'text-marca' : ''} />
            {txt}
          </Link>
        )
      })}
    </div>
  )
}
