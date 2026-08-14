'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'

/** Logo oficial de Google. Va inline porque la CSP no permite hosts externos. */
function LogoGoogle() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15.7z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 40.9 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z" />
      <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.3 29.9 2 24 2 15.4 2 8 7.1 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z" />
    </svg>
  )
}

/** Línea con la palabra "o" para separar el formulario del acceso con Google. */
export function Separador() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-linea" />
      <span className="text-[11px] text-tenue">o</span>
      <span className="h-px flex-1 bg-linea" />
    </div>
  )
}

export default function BotonGoogle({ volver = '/' }: { volver?: string }) {
  const sb = supabaseBrowser()
  const [cargando, setCargando] = useState(false)

  async function entrar() {
    setCargando(true)
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?volver=${encodeURIComponent(volver)}`,
      },
    })
    // Si sale bien, el navegador ya se fue a Google y este código no corre.
    if (error) {
      setCargando(false)
      toast.error('No se pudo abrir el inicio de sesión con Google.')
    }
  }

  return (
    <button type="button" onClick={entrar} disabled={cargando} className="btn btn-suave w-full">
      {cargando ? <Loader2 size={15} className="animate-spin" /> : <LogoGoogle />}
      Continuar con Google
    </button>
  )
}
