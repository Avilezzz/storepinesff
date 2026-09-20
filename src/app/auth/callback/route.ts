import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

/**
 * Vuelta del inicio de sesión con Google. Supabase manda aquí un `code` de
 * un solo uso que se canjea por la sesión; las cookies las escribe
 * `supabaseServer()`, ya sin caducidad (mueren al cerrar el navegador).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const volver = searchParams.get('volver') ?? '/'
  const errorProveedor = searchParams.get('error_description') ?? searchParams.get('error')

  // Solo rutas internas: un `volver` con dominio ajeno sería un redirect abierto.
  const destino = volver.startsWith('/') && !volver.startsWith('//') ? volver : '/'

  if (errorProveedor) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorProveedor)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No llegó el código de Google.')}`)
  }

  const sb = await supabaseServer()
  const { data, error } = await sb.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // La base es la única fuente de verdad: no dependemos de que el metadata de
  // Google y la fila del perfil se actualicen exactamente al mismo tiempo.
  const { data: perfil } = data.user
    ? await sb.from('profiles').select('telefono').eq('id', data.user.id).maybeSingle()
    : { data: null }
  const falta = !perfil?.telefono || perfil.telefono === '0000000000'
  return NextResponse.redirect(
    falta
      ? `${origin}/completar-perfil?volver=${encodeURIComponent(destino)}`
      : `${origin}${destino}`,
  )
}
