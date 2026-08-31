import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { canjeAutomatico } from '@/lib/playwright-canje'

/** Vercel Pro: el canje automático puede tomar hasta 60 segundos. */
export const maxDuration = 60

/**
 * POST /api/recarga/ejecutar
 *
 * Orquesta el canje automático:
 * 1. Verifica la orden (PAGADA, del usuario autenticado)
 * 2. Reserva un PIN disponible
 * 3. Ejecuta el canje en redeem.hype.games via Playwright/Browserless
 * 4. Registra el resultado
 */
export async function POST(req: Request) {
  const inicio = Date.now()

  try {
    const { order_id, id_jugador } = await req.json()

    if (!order_id || !id_jugador) {
      return NextResponse.json(
        { error: 'Faltan datos: order_id e id_jugador son requeridos' },
        { status: 400 },
      )
    }

    // Limpiar ID del jugador
    const idLimpio = String(id_jugador).trim()
    if (!/^\d{5,15}$/.test(idLimpio)) {
      return NextResponse.json(
        { error: 'ID_INVALIDO', mensaje: 'El ID del jugador debe tener entre 5 y 15 dígitos.' },
        { status: 400 },
      )
    }

    const sb = await supabaseServer()

    // 1. Verificar que la orden es del usuario y está PAGADA
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'NO_AUTH' }, { status: 401 })
    }

    const { data: orden } = await sb
      .from('orders')
      .select('id, estado, user_id')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (!orden) {
      return NextResponse.json({ error: 'ORDEN_NO_ENCONTRADA' }, { status: 404 })
    }

    if (orden.estado === 'COMPLETADA') {
      return NextResponse.json({ error: 'ORDEN_YA_COMPLETADA' }, { status: 409 })
    }

    if (orden.estado !== 'PAGADA' && orden.estado !== 'ERROR') {
      return NextResponse.json(
        { error: 'ORDEN_NO_LISTA', mensaje: 'La orden no está en estado válido para canje.' },
        { status: 409 },
      )
    }

    // 2. Reservar PIN
    const { data: pines, error: errReserva } = await sb.rpc('fn_reservar_pin', {
      p_order_id: order_id,
    })

    if (errReserva || !pines || (pines as unknown[]).length === 0) {
      return NextResponse.json(
        { error: 'SIN_STOCK', mensaje: 'No hay códigos disponibles en este momento. Intenta más tarde.' },
        { status: 409 },
      )
    }

    // Marcar orden como PROCESANDO
    await sb.from('orders').update({ estado: 'PROCESANDO' }).eq('id', order_id)

    // 3. Canjear cada PIN (normalmente es 1 para compra directa)
    const resultados = []

    for (const pin of pines as { pin_code_id: number; codigo: string; order_item_id: number }[]) {
      // Marcar PIN como PROCESANDO
      await sb.from('pin_codes').update({ estado: 'PROCESANDO' }).eq('id', pin.pin_code_id)

      const inicioPin = Date.now()

      try {
        const resultado = await canjeAutomatico({
          pin: pin.codigo,
          idJugador: idLimpio,
        })

        const duracion = Date.now() - inicioPin

        // 4. Registrar resultado
        await sb.rpc('fn_finalizar_canje', {
          p_pin_code_id: pin.pin_code_id,
          p_order_id: order_id,
          p_estado: resultado.exito ? 'EXITO' : 'ERROR',
          p_id_jugador: idLimpio,
          p_nombre_jugador: resultado.nombreJugador ?? null,
          p_mensaje_error: resultado.error ?? null,
          p_duracion_ms: duracion,
        })

        resultados.push({
          exito: resultado.exito,
          nombre_jugador: resultado.nombreJugador,
          error: resultado.error,
          duracion_ms: duracion,
        })
      } catch (err) {
        const duracion = Date.now() - inicioPin
        const mensaje = err instanceof Error ? err.message : 'Error desconocido'

        await sb.rpc('fn_finalizar_canje', {
          p_pin_code_id: pin.pin_code_id,
          p_order_id: order_id,
          p_estado: 'ERROR',
          p_id_jugador: idLimpio,
          p_nombre_jugador: null,
          p_mensaje_error: mensaje,
          p_duracion_ms: duracion,
        })

        resultados.push({
          exito: false,
          nombre_jugador: null,
          error: mensaje,
          duracion_ms: duracion,
        })
      }
    }

    const todoExitoso = resultados.every((r) => r.exito)
    const duracionTotal = Date.now() - inicio

    return NextResponse.json({
      exito: todoExitoso,
      nombre_jugador: resultados[0]?.nombre_jugador ?? null,
      resultados,
      duracion_total_ms: duracionTotal,
    })
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: 'ERROR_INTERNO', mensaje }, { status: 500 })
  }
}
