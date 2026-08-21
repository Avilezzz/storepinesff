import { supabaseServer } from '@/lib/supabase'
import AdminPlantillas from '@/components/admin/AdminPlantillas'
import type { Plantilla } from '@/components/admin/plantillas'

export const dynamic = 'force-dynamic'

export default async function Plantillas() {
  const sb = await supabaseServer()
  const { data } = await sb
    .from('email_templates')
    .select('id, nombre, asunto, cuerpo, ambito, activo, orden')
    .order('orden')

  return <AdminPlantillas plantillas={(data as Plantilla[]) ?? []} />
}
