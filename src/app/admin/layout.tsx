import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import NavAdmin from '@/components/admin/NavAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  const { data } = await sb.from('profiles').select('rol').eq('id', user!.id).single()

  // El middleware ya exigió sesión; aquí se exige además el rol. Aunque alguien
  // se saltara esto, RLS y las funciones rechazarían cualquier operación.
  if ((data as { rol: string } | null)?.rol !== 'ADMIN') redirect('/')

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-7">
      <NavAdmin />
      {children}
    </div>
  )
}
