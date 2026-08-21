import { supabaseServer } from '@/lib/supabase'
import AdminUsuarios, { type ClienteFila, type Totales } from '@/components/admin/AdminUsuarios'

export const dynamic = 'force-dynamic'

export default async function Usuarios({ searchParams }: {
  searchParams: Promise<{ q?: string; orden?: string }>
}) {
  const { q = '', orden = 'reciente' } = await searchParams
  const sb = await supabaseServer()

  // Las métricas por cliente se calculan en la base con fn_admin_clientes: son
  // agregados sobre orders y topup_requests que desde aquí saldrían en una
  // consulta por fila.
  const [{ data: clientes }, { count: total }, { data: saldos }, { data: ventas }] = await Promise.all([
    sb.rpc('fn_admin_clientes', { p_q: q, p_orden: orden, p_limite: 60 }),
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('wallets').select('balance_cents'),
    sb.from('orders').select('total_cents'),
  ])

  const suma = (filas: { [k: string]: number }[] | null, campo: string) =>
    (filas ?? []).reduce((t, f) => t + (f[campo] ?? 0), 0)

  const totales: Totales = {
    clientes: total ?? 0,
    saldo_cents: suma(saldos, 'balance_cents'),
    vendido_cents: suma(ventas, 'total_cents'),
  }

  return <AdminUsuarios clientes={(clientes as ClienteFila[]) ?? []}
    totales={totales} q={q} orden={orden} />
}
