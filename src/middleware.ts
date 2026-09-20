import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDeSesion } from '@/lib/cookies-sesion'

/** Rutas que exigen sesión iniciada. */
const PRIVADAS = ['/billetera', '/recargar', '/mis-compras', '/admin', '/cuenta',
                  '/completar-perfil', '/ganancias']

const SIN_PERFIL_OK = ['/completar-perfil']

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

  // `profiles.telefono` es la única fuente de verdad. Antes se mezclaba con
  // metadata de Auth y eso hacía que el formulario reapareciera o saltara de
  // lugar cuando una de las dos copias tardaba en actualizarse.
  if (user && PRIVADAS.some((p) => path.startsWith(p))
      && !SIN_PERFIL_OK.some((p) => path.startsWith(p))) {
    const { data: perfil } = await supabase.from('profiles')
      .select('telefono').eq('id', user.id).maybeSingle()
    if (!perfil?.telefono || perfil.telefono === '0000000000') {
      const url = req.nextUrl.clone()
      url.pathname = '/completar-perfil'
      url.searchParams.set('volver', `${path}${req.nextUrl.search}`)
      return NextResponse.redirect(url)
    }
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
