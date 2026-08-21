import Link from 'next/link'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Baja de las novedades desde el enlace del correo. A propósito no pide iniciar
 * sesión: obligar a entrar para poder salir es la forma más rápida de que
 * alguien pulse "spam" en vez de darse de baja, y eso sí castiga al dominio.
 * El token del enlace es la única llave.
 */
export default async function Baja({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams

  let nombre: string | null = null
  if (t) {
    const { data } = await supabasePublic().rpc('fn_baja_novedades', { p_token: t })
    nombre = (data as string | null) ?? null
  }

  const ok = Boolean(nombre)

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="tarjeta w-full max-w-sm px-6 py-10 text-center">
        {ok ? (
          <>
            <CheckCircle2 size={30} strokeWidth={1.5} className="mx-auto text-ok" />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Listo, {nombre}</h1>
            <p className="mt-2 text-sm leading-relaxed text-tenue">
              No volverás a recibir novedades de FFPINS. Los correos de tus compras y
              recargas sí seguirán llegando, porque son parte del servicio.
            </p>
          </>
        ) : (
          <>
            <AlertCircle size={30} strokeWidth={1.5} className="mx-auto text-alerta" />
            <h1 className="mt-3 text-lg font-semibold tracking-tight">Enlace no válido</h1>
            <p className="mt-2 text-sm leading-relaxed text-tenue">
              Puede que ya te hayas dado de baja. También puedes cambiarlo desde Mi cuenta.
            </p>
          </>
        )}

        <Link href="/" className="btn btn-suave mt-6">Ir a la tienda</Link>
      </div>
    </div>
  )
}
