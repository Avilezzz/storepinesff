import { supabaseServer } from '@/lib/supabase'
import AdminSolicitudes, { type SolicitudFila } from '@/components/admin/AdminSolicitudes'

export const dynamic = 'force-dynamic'

export default async function Solicitudes() {
  const sb = await supabaseServer()

  const { data, error } = await sb
    .from('product_requests')
    .select('id, created_at, products(id, nombre, diamantes, precio_cents, stock_disponible, imagen_url), profiles(nombre, email, telefono)')
    .order('created_at', { ascending: false })

  if (error) console.error('[admin/solicitudes]', error)

  return (
    <AdminSolicitudes
      solicitudes={(data as unknown as SolicitudFila[]) ?? []}
      error={error?.message ?? null}
    />
  )
}
