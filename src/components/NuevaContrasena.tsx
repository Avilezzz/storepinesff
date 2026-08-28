'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'

/**
 * Formulario del enlace de recuperación, con la cuenta atrás a la vista.
 *
 * El contador arranca con los segundos que dijo la base y se recalcula por
 * diferencia contra el instante de vencimiento, no restando de uno en uno: si
 * el móvil se bloquea a mitad, al volver el número es el correcto y no uno
 * congelado. De todas formas quien manda es la base: aunque aquí sobrara
 * tiempo, un token vencido no cambia ninguna contraseña.
 */
export default function NuevaContrasena({ token, segundos, correo }: {
  token: string; segundos: number; correo: string
}) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const vence = useRef(Date.now() + segundos * 1000)
  const [restan, setRestan] = useState(segundos)
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [ver, setVer] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setRestan(Math.max(0, Math.round((vence.current - Date.now()) / 1000)))
    }, 500)
    return () => clearInterval(id)
  }, [])

  const vencido = restan <= 0
  const reloj = `${Math.floor(restan / 60)}:${String(restan % 60).padStart(2, '0')}`

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 8)  return toast.error('La contraseña debe tener al menos 8 caracteres.')
    if (pass !== pass2)   return toast.error('Las contraseñas no coinciden.')

    setCargando(true)
    const { error } = await sb.rpc('fn_reset_confirmar', { p_token: token, p_password: pass })

    if (error) {
      setCargando(false)
      return toast.error(mensajeError(error.message))
    }

    // La base cerró todas las sesiones del usuario; aquí solo queda tirar las
    // cookies de esta pestaña para que no arrastre una sesión que ya no existe.
    try { await sb.auth.signOut({ scope: 'local' }) } catch {}

    toast.success('Contraseña cambiada. Ya puedes ingresar.')
    router.push('/login')
    router.refresh()
  }

  if (vencido) {
    return (
      <div className="tarjeta p-5 text-center">
        <AlertCircle size={30} strokeWidth={1.5} className="mx-auto text-alerta" />
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Se acabaron los 5 minutos y el enlace se borró. Pide otro, tarda un segundo.
        </p>
        <Link href="/recuperar" className="btn btn-primario mt-5 w-full">
          Pedir un enlace nuevo
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-panel2 p-3">
        <p className="truncate text-xs text-tenue">{correo}</p>
        <p className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums
          ${restan <= 60 ? 'text-error' : 'text-tenue'}`}>
          <Clock size={13} /> {reloj}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Contraseña nueva</label>
        <div className="relative">
          <input type={ver ? 'text' : 'password'} required autoFocus autoComplete="new-password"
            className="campo pr-11" value={pass} onChange={(e) => setPass(e.target.value)}
            placeholder="Mínimo 8 caracteres" />
          <button type="button" onClick={() => setVer((v) => !v)}
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="btn-icono absolute right-1 top-1/2 -translate-y-1/2">
            {ver ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Repite la contraseña</label>
        <input type={ver ? 'text' : 'password'} required autoComplete="new-password"
          className="campo" value={pass2} onChange={(e) => setPass2(e.target.value)}
          placeholder="••••••••" />
      </div>

      <button disabled={cargando} className="btn btn-primario w-full">
        {cargando
          ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
          : 'Cambiar contraseña'}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-tenue">
        Al cambiarla se cierran las sesiones abiertas en otros dispositivos.
      </p>
    </form>
  )
}
