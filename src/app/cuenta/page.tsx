import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import CuentaUI, { type Perfil } from '@/components/CuentaUI'

export const dynamic = 'force-dynamic'

export default async function Cuenta() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?volver=/cuenta')

  const [{ data: perfil }, { data: wallet }, { count: compras }] = await Promise.all([
    sb.from('profiles').select('nombre, telefono, email, rol, acepta_novedades').eq('id', user.id).single(),
    sb.from('wallets').select('balance_cents').eq('user_id', user.id).maybeSingle(),
    // Mismo motivo que en /mis-compras: sin filtro, el admin vería aquí el
    // total de compras de la tienda como si fueran suyas.
    sb.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
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
