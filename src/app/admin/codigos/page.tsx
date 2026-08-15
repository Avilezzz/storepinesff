import { supabaseServer } from '@/lib/supabase'
import AdminCodigos, { type ProductoStock, type PinLibre } from '@/components/admin/AdminCodigos'

export const dynamic = 'force-dynamic'

export default async function Codigos() {
  const sb = await supabaseServer()

  type Prod = {
    id: string; nombre: string; diamantes: number
    stock_disponible: number; activo: boolean; costo_cents: number
  }

  const [{ data: prodRaw }, { data: pinesRaw }, { data: libresRaw }] = await Promise.all([
    sb.from('products').select('id, nombre, diamantes, stock_disponible, activo, costo_cents').order('orden'),
    sb.from('pin_codes').select('product_id, estado'),
    // Solo los que nadie compró: son los únicos que se pueden borrar.
    sb.from('pin_codes').select('id, codigo, product_id, created_at')
      .eq('estado', 'DISPONIBLE').order('id', { ascending: false }).limit(500),
  ])

  const productos = prodRaw as Prod[] | null
  const pines = pinesRaw as { product_id: string; estado: string }[] | null

  const conteo = (pines ?? []).reduce<Record<string, { vendidos: number; defectuosos: number }>>((acc, p) => {
    acc[p.product_id] ??= { vendidos: 0, defectuosos: 0 }
    if (p.estado === 'VENDIDO') acc[p.product_id].vendidos++
    if (p.estado === 'DEFECTUOSO') acc[p.product_id].defectuosos++
    return acc
  }, {})

  const lista: ProductoStock[] = (productos ?? []).map((p) => ({
    ...p,
    vendidos: conteo[p.id]?.vendidos ?? 0,
    defectuosos: conteo[p.id]?.defectuosos ?? 0,
  }))

  return <AdminCodigos productos={lista} libres={(libresRaw as PinLibre[]) ?? []} />
}
