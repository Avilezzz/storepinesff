import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente para componentes con "use client". Vive en su propio módulo porque
 * `supabase.ts` importa `next/headers`, que no puede llegar al navegador.
 * Se memoiza por pestaña: una sola conexión de Realtime para toda la app.
 */
let browser: ReturnType<typeof createBrowserClient> | undefined
export function supabaseBrowser() {
  browser ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return browser
}
