'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'

/** Lo que la base deja pedir otro enlace: un correo por minuto. */
const ESPERA = 60

/**
 * Pedir el enlace para recuperar la contraseña. La respuesta es siempre la
 * misma exista la cuenta o no: si dijera "ese correo no está registrado",
 * cualquiera podría usar este formulario para averiguar quién compra aquí.
 */
export default function Recuperar() {
  const sb = supabaseBrowser()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)

    const { error } = await sb.rpc('fn_reset_solicitar', {
      p_email: email.trim().toLowerCase(),
    })

    setCargando(false)
    if (error) return toast.error('No se pudo enviar el correo. Inténtalo de nuevo.')

    setEnviado(true)
    setEspera(ESPERA)
  }

  return (
    <div className="aura flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-4 h-9 w-auto" />
          <h1 className="titulo">{enviado ? 'Revisa tu correo' : '¿Olvidaste tu contraseña?'}</h1>
        </div>

        {enviado ? (
          <div className="tarjeta p-5 text-center">
            <MailCheck size={30} strokeWidth={1.5} className="mx-auto text-ok" />
            <p className="mt-3 text-sm leading-relaxed text-tenue">
              Si <span className="font-medium text-fuerte">{email.trim().toLowerCase()}</span>{' '}
              tiene cuenta en FFPINS, ya salió un enlace para crear tu contraseña nueva.
            </p>
            <p className="mt-3 rounded-lg bg-panel2 p-3 text-xs leading-relaxed text-tenue">
              El enlace <b>vence en 5 minutos</b> y sirve una sola vez. Si no lo ves, mira en spam.
            </p>

            <button onClick={enviar} disabled={espera > 0 || cargando}
              className="btn btn-suave mt-5 w-full">
              {espera > 0 ? `Reenviar en ${espera}s` : 'Enviar otro enlace'}
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
            <p className="text-sm leading-relaxed text-tenue">
              Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva.
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-tenue">Correo electrónico</label>
              <input type="email" required autoFocus autoComplete="email" inputMode="email"
                className="campo" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@gmail.com" />
            </div>

            <button disabled={cargando} className="btn btn-primario w-full">
              {cargando
                ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
                : 'Enviar enlace'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-tenue hover:text-marca">
            <ArrowLeft size={14} /> Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
