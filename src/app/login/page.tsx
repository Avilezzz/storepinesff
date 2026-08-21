'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import BotonGoogle, { Separador } from '@/components/BotonGoogle'

export default function Login() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  )
}

function Formulario() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const params = useSearchParams()
  const volver = params.get('volver') ?? '/'
  const errorOAuth = params.get('error')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [ver, setVer] = useState(false)
  const [cargando, setCargando] = useState(false)

  // El callback de Google devuelve aquí el fallo, si lo hubo.
  useEffect(() => {
    if (errorOAuth) toast.error(errorOAuth)
  }, [errorOAuth])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)

    const { error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    })

    if (error) {
      setCargando(false)
      return toast.error(mensajeError(error.message))
    }

    // Cliente o admin entran por la misma puerta; el rol decide qué ve después.
    router.push(volver)
    router.refresh()
  }

  return (
    <div className="aura flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-4 h-9 w-auto" />
          <h1 className="titulo">Ingresa a tu cuenta</h1>
        </div>

        <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-tenue">Correo electrónico</label>
            <input type="email" required autoComplete="email" inputMode="email" className="campo"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-tenue">Contraseña</label>
            <div className="relative">
              <input type={ver ? 'text' : 'password'} required autoComplete="current-password"
                className="campo pr-11" value={pass} onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••" />
              <button type="button" onClick={() => setVer((v) => !v)}
                aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="btn-icono absolute right-1 top-1/2 -translate-y-1/2">
                {ver ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button disabled={cargando} className="btn btn-primario w-full">
            {cargando ? <><Loader2 size={15} className="animate-spin" /> Ingresando…</> : 'Ingresar'}
          </button>

          <Separador />
          <BotonGoogle volver={volver} />
        </form>

        <p className="mt-5 text-center text-sm text-tenue">
          ¿No tienes cuenta? <Link href="/registro" className="font-medium text-marca">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}
