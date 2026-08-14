import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import CuentaUI, { type Perfil } from '@/components/CuentaUI'

export const dynamic = 'force-dynamic'

export default async function Cuenta() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?volver=/cuenta')

  const [{ data: perfil }, { data: wallet }, { count: compras }] = await Promise.all([
    sb.from('profiles').select('nombre, telefono, email, rol').eq('id', user.id).single(),
    sb.from('wallets').select('balance_cents').eq('user_id', user.id).maybeSingle(),
    sb.from('orders').select('id', { count: 'exact', head: true }),
  ])

  // Con qué entró: correo y contraseña, Google, o ambos vinculados.
  const proveedores = (user.identities ?? []).map((i) => i.provider)

  return (
    <CuentaUI
      perfil={perfil as Perfil}
      saldo={wallet?.balance_cents ?? 0}
      compras={compras ?? 0}
      proveedores={proveedores}
    />
  )
}
