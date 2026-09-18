import { NextResponse } from 'next/server'

// Mantener una respuesta explícita para clientes abiertos antes de la actualización.
// No cobrar, reservar pines ni iniciar Browserless desde estas rutas retiradas.
export async function POST() {
  return NextResponse.json({
    error: 'CANJE_MANUAL',
    mensaje: 'Ahora el canje es manual. Actualiza la página y revisa Mis compras antes de volver a comprar. Si ya pagaste y no tienes un PIN, contacta soporte.',
  }, { status: 410 })
}
