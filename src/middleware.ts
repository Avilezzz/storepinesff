import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDeSesion } from '@/lib/cookies-sesion'

/** Rutas que exigen sesión iniciada. */
const PRIVADAS = ['/carrito', '/billetera', '/recargar', '/mis-compras', '/admin', '/cuenta',
                  '/completar-perfil']

/** Privadas donde sí se entra con el perfil a medias: son las que lo completan. */
const SIN_PERFIL_OK = ['/cuenta', '/completar-perfil']

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          // Sin caducidad: al refrescar el token la cookie sigue siendo de
          // sesión y no revive los 400 días que pone la librería por defecto.
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, cookieDeSesion(options)))
        },
      },
    },
  )

  // Refresca el token si expiró. Debe ir antes de cualquier redirección.
  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  if (!user && PRIVADAS.some((p) => path.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('volver', path)
    return NextResponse.redirect(url)
  }

  // Quien entró por Google no trae teléfono: se le pide antes de dejarlo
  // operar con dinero. El dato viaja en el metadata de la sesión, así que
  // comprobarlo no cuesta una consulta a la base.
  if (user && !user.user_metadata?.telefono
      && PRIVADAS.some((p) => path.startsWith(p))
      && !SIN_PERFIL_OK.some((p) => path.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/completar-perfil'
    url.searchParams.set('volver', path)
    return NextResponse.redirect(url)
  }

  if (user && (path === '/login' || path === '/registro')) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  // Se salta estáticos e imágenes: el middleware solo corre donde importa la sesión.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
}
