import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { supabasePublic } from '@/lib/supabase'
import NuevaContrasena from '@/components/NuevaContrasena'

export const dynamic = 'force-dynamic'

/** El enlace del correo. Sin sesión: el token es la única llave, igual que en
 *  la baja de novedades. La vigencia la dice la base, no el reloj del visitante:
 *  adelantar la hora del móvil no alarga un token de 5 minutos. */
export default async function RecuperarConToken({ params }: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data } = await supabasePublic().rpc('fn_reset_estado', { p_token: token })
  const estado = data as { valido: boolean; segundos?: number; correo?: string } | null

  return (
    <div className="aura flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-4 h-9 w-auto" />
          <h1 className="titulo">
            {estado?.valido ? 'Crea tu contraseña nueva' : 'Este enlace ya no sirve'}
          </h1>
        </div>

        {estado?.valido ? (
          <NuevaContrasena token={token} segundos={estado.segundos ?? 0} correo={estado.correo ?? ''} />
        ) : (
          <div className="tarjeta p-5 text-center">
            <AlertCircle size={30} strokeWidth={1.5} className="mx-auto text-alerta" />
            <p className="mt-3 text-sm leading-relaxed text-tenue">
              Los enlaces duran 5 minutos y se usan una sola vez. Este ya venció o alguien
              lo usó antes. Tu contraseña no ha cambiado.
            </p>
            <Link href="/recuperar" className="btn btn-primario mt-5 w-full">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
