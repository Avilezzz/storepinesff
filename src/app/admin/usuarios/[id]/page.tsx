import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import FichaCliente, { type Cliente } from '@/components/admin/FichaCliente'

export const dynamic = 'force-dynamic'

export default async function DetalleCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await supabaseServer()

  // Toda la ficha viene en una sola llamada: perfil, métricas, ranking de
  // productos, compras, movimientos, recargas y correos. La misma función
  // servirá el día que esto lo lea una IA para recomendar.
  const { data } = await sb.rpc('fn_admin_cliente', { p_id: id })

  const cliente = data as Cliente | null
  if (!cliente?.perfil) notFound()

  return <FichaCliente cliente={cliente} />
}
