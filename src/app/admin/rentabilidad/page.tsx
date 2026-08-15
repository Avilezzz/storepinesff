import { supabaseServer } from '@/lib/supabase'
import AdminRentabilidad, { type Rentabilidad } from '@/components/admin/AdminRentabilidad'

export const dynamic = 'force-dynamic'

export default async function Costos() {
  const sb = await supabaseServer()
  const { data, error } = await sb.rpc('fn_admin_rentabilidad')

  if (error) console.error('[admin/rentabilidad]', error)

  return <AdminRentabilidad datos={data as Rentabilidad} />
}
