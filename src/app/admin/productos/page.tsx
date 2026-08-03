import { supabaseServer } from '@/lib/supabase'
import AdminProductos, { type Producto } from '@/components/admin/AdminProductos'

export const dynamic = 'force-dynamic'

export default async function Productos() {
  const sb = await supabaseServer()
  const { data } = await sb.from('products')
    .select('id, slug, nombre, diamantes, precio_cents, activo, orden, stock_disponible')
    .order('orden')

  return <AdminProductos productos={(data as Producto[]) ?? []} />
}
