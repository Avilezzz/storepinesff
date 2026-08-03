import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Cliente anónimo sin cookies, para leer datos públicos (el catálogo).
 * Al no tocar cookies, la página que lo usa se puede cachear e ISR-ear:
 * el catálogo se renderiza una vez y se sirve desde CDN a todo el mundo.
 */
export const supabasePublic = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

/** Cliente para Server Components, Server Actions y Route Handlers. */
export async function supabaseServer() {
  const store = await cookies()
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // En un Server Component las cookies son de solo lectura; el refresco
        // de sesión lo hace el middleware, así que aquí se ignora sin ruido.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {}
      },
    },
  })
}
