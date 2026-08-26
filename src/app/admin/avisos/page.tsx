import { supabaseServer } from '@/lib/supabase'
import AdminAvisos from '@/components/admin/AdminAvisos'
import {
  CAMPOS_AVISO, METRICAS_VACIAS, type Aviso, type MetricasAvisos,
} from '@/lib/avisos'

export const dynamic = 'force-dynamic'

export default async function Avisos() {
  const sb = await supabaseServer()

  const [lista, metricas] = await Promise.all([
    sb.from('notices').select(CAMPOS_AVISO).order('orden').order('created_at'),
    sb.rpc('fn_admin_avisos_metricas'),
  ])

  return (
    <AdminAvisos
      avisos={(lista.data as Aviso[]) ?? []}
      metricas={(metricas.data as MetricasAvisos) ?? METRICAS_VACIAS}
    />
  )
}
