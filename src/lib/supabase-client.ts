import { createBrowserClient } from '@supabase/ssr'
import { leerCookiesDelNavegador, escribirCookieEnNavegador } from './cookies-sesion'

/**
 * Cliente para componentes con "use client". Vive en su propio módulo porque
 * `supabase.ts` importa `next/headers`, que no puede llegar al navegador.
 * Se memoiza por pestaña: una sola conexión de Realtime para toda la app.
 *
 * El adaptador de cookies es propio a propósito: @supabase/ssr las escribe con
 * 400 días de vida y no deja configurarlo. Aquí salen sin caducidad, así la
 * sesión se cierra sola cuando el usuario cierra el navegador.
 */
let browser: ReturnType<typeof createBrowserClient> | undefined
export function supabaseBrowser() {
  browser ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: leerCookiesDelNavegador,
        setAll: (lista) => {
          lista.forEach(({ name, value, options }) =>
            escribirCookieEnNavegador(name, value, options))
        },
      },
    },
  )
  return browser
}
