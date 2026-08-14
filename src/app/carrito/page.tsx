import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import CarritoUI, { type LineaCarrito } from '@/components/CarritoUI'

export const dynamic = 'force-dynamic'

export default async function Carrito() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  const [{ data: items }, { data: wallet }] = await Promise.all([
    sb.from('cart_items')
      .select('cantidad, products(id, nombre, diamantes, precio_cents, stock_disponible, activo, imagen_url)')
      .eq('user_id', user!.id),
    sb.from('wallets').select('balance_cents').eq('user_id', user!.id).single(),
  ])

  type FilaCruda = { cantidad: number; products: LineaCarrito['producto'] }

  const lineas: LineaCarrito[] = ((items ?? []) as unknown as FilaCruda[])
    .map((i) => ({ cantidad: i.cantidad, producto: i.products }))
    .filter((l) => l.producto?.activo)
    .sort((a, b) => a.producto.diamantes - b.producto.diamantes)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-9">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="titulo">Tu carrito</h1>
        <Link href="/" className="enlace">
          <ArrowLeft size={14} /> Seguir comprando
        </Link>
      </div>

      <CarritoUI lineas={lineas} saldo={wallet?.balance_cents ?? 0} />
    </div>
  )
}
