import { supabaseServer } from '@/lib/supabase'
import AdminUsuarios, { type UsuarioFila } from '@/components/admin/AdminUsuarios'

export const dynamic = 'force-dynamic'

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const sb = await supabaseServer()

  let consulta = sb.from('profiles')
    .select('id, nombre, email, telefono, rol, activo, created_at, wallets(balance_cents)')
    .order('created_at', { ascending: false })
    .limit(60)

  if (q.trim()) {
    const t = `%${q.trim()}%`
    consulta = consulta.or(`nombre.ilike.${t},email.ilike.${t},telefono.ilike.${t}`)
  }

  const { data } = await consulta
  return <AdminUsuarios usuarios={(data as unknown as UsuarioFila[]) ?? []} q={q} />
}
