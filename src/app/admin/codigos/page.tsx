import { supabaseServer } from '@/lib/supabase'
import AdminCodigos, { type ProductoStock } from '@/components/admin/AdminCodigos'

export const dynamic = 'force-dynamic'

export default async function Codigos() {
  const sb = await supabaseServer()

  type Prod = { id: string; nombre: string; diamantes: number; stock_disponible: number; activo: boolean }

  const [{ data: prodRaw }, { data: pinesRaw }] = await Promise.all([
    sb.from('products').select('id, nombre, diamantes, stock_disponible, activo').order('orden'),
    sb.from('pin_codes').select('product_id, estado'),
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

  return <AdminCodigos productos={lista} />
}
