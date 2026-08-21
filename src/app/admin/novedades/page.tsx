import { supabaseServer } from '@/lib/supabase'
import AdminNovedades, { type Stats } from '@/components/admin/AdminNovedades'

export const dynamic = 'force-dynamic'

export default async function Novedades() {
  const sb = await supabaseServer()
  const { data } = await sb.rpc('fn_admin_novedades_stats')

  return <AdminNovedades stats={data as Stats} />
}
