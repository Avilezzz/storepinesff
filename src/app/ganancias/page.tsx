import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import GananciasUI, { type PrecioRevendedor, type VentaRevendedor } from '@/components/GananciasUI'

export const dynamic = 'force-dynamic'

export default async function Ganancias() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect('/login')
  const { data: perfil } = await sb.from('profiles').select('es_revendedor').eq('id', user.id).single(); if (!perfil?.es_revendedor) redirect('/')
  const [prod, propios, ventasR, ordenesR] = await Promise.all([
    sb.from('products').select('id,nombre,imagen_url,precio_cents,pvp_sugerido_cents').eq('activo', true).order('orden'),
    sb.from('reseller_prices').select('product_id,pvp_cents').eq('user_id', user.id),
    sb.from('reseller_sales').select('id,tipo,cost_cents,sale_price_cents,profit_cents,created_at,products(nombre)').eq('user_id', user.id).order('created_at', { ascending: false }),
    sb.from('orders').select('order_items(id)').eq('user_id', user.id),
  ])
  const mapa = new Map((propios.data ?? []).map(x => [x.product_id, x.pvp_cents]))
  const productos = (prod.data ?? []).map(p => ({ ...p, pvp_cents: mapa.get(p.id) ?? p.pvp_sugerido_cents })) as PrecioRevendedor[]
  const itemIds = (ordenesR.data ?? []).flatMap(o => o.order_items.map(i => i.id))
  let pendientes = 0
  if (itemIds.length) {
    const [{ data: pines }, { data: registrados }] = await Promise.all([sb.from('pin_codes').select('id').in('order_item_id', itemIds).eq('estado', 'VENDIDO'), sb.from('reseller_sales').select('pin_code_id').eq('user_id', user.id)])
    const usados = new Set((registrados ?? []).map(x => x.pin_code_id)); pendientes = (pines ?? []).filter(x => !usados.has(x.id)).length
  }
  return <GananciasUI productos={productos} ventas={(ventasR.data ?? []) as unknown as VentaRevendedor[]} pendientes={pendientes} />
}
