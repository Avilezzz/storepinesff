'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gem, ShoppingCart, Wallet, Package, ArrowUpCircle, Settings, LogOut } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion } from '@/lib/sesion'
import { usd } from '@/lib/format'
import Avatar from './ui/Avatar'
import Campanita from './Campanita'

const MENU = [
  { href: '/mis-compras', txt: 'Mis compras', Icono: Package },
  { href: '/billetera', txt: 'Mi billetera', Icono: Wallet },
  { href: '/recargar', txt: 'Recargar saldo', Icono: ArrowUpCircle },
]

export default function Navbar() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const { uid, nombre, rol, saldo, items, cargando } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const salir = async () => {
    setAbierto(false)
    await sb.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-linea bg-base/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-marca text-[#150c04]">
            <Gem size={15} strokeWidth={2.5} />
          </span>
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            PinStore <span className="text-marca">FF</span>
          </span>
        </Link>

        <div className="flex-1" />

        {cargando ? (
          <div className="h-8 w-24 animate-pulse rounded-lg bg-panel2" />
        ) : uid ? (
          <>
            <Link href="/billetera"
              className="hidden items-center gap-1.5 rounded-lg border border-linea bg-panel px-2.5 py-1.5 text-sm transition hover:border-marca/50 sm:flex">
              <Wallet size={14} className="text-tenue" />
              <span className="cifra font-semibold">{saldo === null ? '—' : usd(saldo)}</span>
            </Link>

            <Campanita uid={uid} />

            <Link href="/carrito" className="btn-icono relative hidden sm:inline-flex" aria-label="Carrito">
              <ShoppingCart size={19} />
              {items > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-marca px-1 text-[10px] font-bold text-[#150c04]">
                  {items}
                </span>
              )}
            </Link>

            <div className="relative" ref={caja}>
              <button onClick={() => setAbierto((v) => !v)}
                aria-haspopup="menu" aria-expanded={abierto}
                className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-panel2">
                {/* El perfil llega un instante después de la sesión. */}
                {nombre
                  ? <Avatar nombre={nombre} size={30} />
                  : <span className="h-[30px] w-[30px] animate-pulse rounded-full bg-panel2" />}
                <span className="hidden max-w-28 truncate pr-1.5 text-sm font-medium md:inline">{nombre}</span>
              </button>

              {abierto && (
                <div role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-linea bg-panel shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-linea p-3.5">
                    {nombre
                      ? <Avatar nombre={nombre} size={38} />
                      : <span className="h-[38px] w-[38px] animate-pulse rounded-full bg-panel2" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{nombre || 'Mi cuenta'}</p>
                      <p className="cifra text-xs text-tenue">{saldo === null ? '—' : usd(saldo)} disponible</p>
                    </div>
                  </div>

                  {MENU.map(({ href, txt, Icono }) => (
                    <Link key={href} href={href} role="menuitem" onClick={() => setAbierto(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-tenue transition hover:bg-panel2 hover:text-white">
                      <Icono size={16} /> {txt}
                    </Link>
                  ))}

                  {rol === 'ADMIN' && (
                    <Link href="/admin" role="menuitem" onClick={() => setAbierto(false)}
                      className="flex items-center gap-2.5 border-t border-linea px-3.5 py-2.5 text-sm font-medium text-marca transition hover:bg-panel2">
                      <Settings size={16} /> Administración
                    </Link>
                  )}

                  <button onClick={salir} role="menuitem"
                    className="flex w-full items-center gap-2.5 border-t border-linea px-3.5 py-2.5 text-sm text-tenue transition hover:bg-panel2 hover:text-error">
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-suave">Ingresar</Link>
            <Link href="/registro" className="btn btn-primario hidden sm:inline-flex">Crear cuenta</Link>
          </>
        )}
      </nav>
    </header>
  )
}
