import { supabaseServer } from '@/lib/supabase'
import AdminRecargas, { type Solicitud } from '@/components/admin/AdminRecargas'

export const dynamic = 'force-dynamic'

export default async function Recargas({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'PENDIENTE' } = await searchParams
  const sb = await supabaseServer()

  // topup_requests apunta dos veces a profiles (user_id y revisado_por), así que
  // el join se desambigua nombrando la clave foránea. Sin esto PostgREST no sabe
  // cuál usar y devuelve error en lugar de filas.
  const { data, error } = await sb
    .from('topup_requests')
    .select('id, amount_cents, banco, numero_referencia, fecha_transferencia, comprobante_path, estado, nota_usuario, nota_admin, created_at, profiles!topup_requests_user_id_fkey(nombre, email, telefono)')
    .eq('estado', estado)
    .order('id', { ascending: estado === 'PENDIENTE' })
    .limit(100)

  if (error) console.error('[admin/recargas]', error)

  return (
    <AdminRecargas
      solicitudes={(data as unknown as Solicitud[]) ?? []}
      estado={estado}
      error={error?.message ?? null}
    />
  )
}
