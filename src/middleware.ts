import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rutas que exigen sesión iniciada. */
const PRIVADAS = ['/carrito', '/billetera', '/recargar', '/mis-compras', '/admin', '/cuenta']

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
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
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
