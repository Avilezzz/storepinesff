import { supabaseServer } from '@/lib/supabase'
import AdminAsistente, {
  type Kb, type Pendiente, type MetricasAsistente,
} from '@/components/admin/AdminAsistente'

export const dynamic = 'force-dynamic'

const VACIAS: MetricasAsistente = {
  hoy: 0, con_ia: 0, con_basico: 0, pendientes: 0, clientes: 0,
}

export default async function Asistente() {
  const sb = await supabaseServer()

  const [kb, pendientes, metricas] = await Promise.all([
    sb.from('assistant_kb').select('id, pregunta, respuesta, claves, acciones, activo, orden').order('orden'),
    sb.rpc('fn_admin_asistente_pendientes', { p_limite: 40 }),
    sb.rpc('fn_admin_asistente_metricas'),
  ])

  return (
    <AdminAsistente
      kb={(kb.data as Kb[]) ?? []}
      pendientes={(pendientes.data as Pendiente[]) ?? []}
      metricas={(metricas.data as MetricasAsistente) ?? VACIAS}
    />
  )
}
