import { supabaseServer } from '@/lib/supabase'
import AdminReclamos, { type Reclamo } from '@/components/admin/AdminReclamos'

export const dynamic = 'force-dynamic'

export default async function Reclamos() {
  const sb = await supabaseServer()
  // claims también apunta dos veces a profiles (user_id y resuelto_por): el join
  // se desambigua nombrando la clave foránea.
  const { data, error } = await sb
    .from('claims')
    .select('id, motivo, descripcion, estado, monto_reembolsado_cents, nota_admin, created_at, pin_codes(codigo), order_items(producto_nombre, precio_unit_cents), profiles!claims_user_id_fkey(nombre, email)')
    .order('estado')
    .order('id', { ascending: false })
    .limit(100)

  if (error) console.error('[admin/reclamos]', error)

  return <AdminReclamos reclamos={(data as unknown as Reclamo[]) ?? []} error={error?.message ?? null} />
}
