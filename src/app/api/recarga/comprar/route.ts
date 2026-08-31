import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

/**
 * POST /api/recarga/comprar
 *
 * Crea una orden pagada para un solo producto.
 * No asigna PIN: eso ocurre al momento del canje.
 */
export async function POST(req: Request) {
  try {
    const { product_id, cantidad = 1, client_request_id } = await req.json()

    if (!product_id) {
      return NextResponse.json({ error: 'PRODUCTO_REQUERIDO' }, { status: 400 })
    }

    const sb = await supabaseServer()
    const { data, error } = await sb.rpc('fn_compra_directa', {
      p_product_id: product_id,
      p_cantidad: cantidad,
      p_client_request_id: client_request_id ?? null,
    })

    if (error) {
      const msg = error.message
      const status = msg.includes('SALDO_INSUFICIENTE') ? 402
                   : msg.includes('STOCK_INSUFICIENTE') ? 409
                   : msg.includes('NO_AUTH') ? 401
                   : 400
      return NextResponse.json({ error: msg }, { status })
    }

    return NextResponse.json({ order_id: data })
  } catch {
    return NextResponse.json({ error: 'ERROR_INTERNO' }, { status: 500 })
  }
}
