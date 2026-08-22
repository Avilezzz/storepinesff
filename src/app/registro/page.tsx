'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import { VERSION_LEGAL, EDAD_MINIMA } from '@/lib/legal'
import BotonGoogle, { Separador } from '@/components/BotonGoogle'

export default function Registro() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [f, setF] = useState({ nombre: '', telefono: '', email: '', pass: '', pass2: '' })
  const [ver, setVer] = useState(false)
  const [acepta, setAcepta] = useState(false)
  const [cargando, setCargando] = useState(false)

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function enviar(e: React.FormEvent) {
    e.preventDefault()

    // Ecuador: 09XXXXXXXX (10 dígitos) o con prefijo +593.
    const tel = f.telefono.replace(/[\s()-]/g, '')
    if (f.nombre.trim().length < 3)             return toast.error('Escribe tu nombre completo.')
    if (!/^(\+593\d{9}|0\d{9})$/.test(tel))     return toast.error('Teléfono inválido. Usa 09XXXXXXXX.')
    if (f.pass.length < 8)                      return toast.error('La contraseña debe tener al menos 8 caracteres.')
    if (f.pass !== f.pass2)                     return toast.error('Las contraseñas no coinciden.')
    if (!acepta) return toast.error('Debes aceptar los términos y la política de privacidad.')

    setCargando(true)
    const { error } = await sb.auth.signUp({
      email: f.email.trim().toLowerCase(),
      password: f.pass,
      options: { data: { nombre: f.nombre.trim(), telefono: tel } },
    })

    if (error) {
      setCargando(false)
      return toast.error(mensajeError(error.message))
    }

    // Queda anotado qué versión aceptó y cuándo: la LOPDP exige poder
    // demostrar el consentimiento, no solo haberlo pedido.
    await sb.rpc('fn_aceptar_terminos', { p_version: VERSION_LEGAL })

    toast.success(`¡Bienvenido, ${f.nombre.trim().split(' ')[0]}!`)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="aura px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-4 h-9 w-auto" />
          <h1 className="titulo">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-tenue">Recarga saldo y compra pines al instante.</p>
        </div>

        <form onSubmit={enviar} className="tarjeta space-y-4 p-5">
          <Campo etiqueta="Nombre completo" valor={f.nombre} onChange={set('nombre')}
            placeholder="Luis Avilez" autoComplete="name" />

          <Campo etiqueta="Teléfono" valor={f.telefono} onChange={set('telefono')}
            placeholder="0987654321" inputMode="tel" autoComplete="tel" />

          <Campo etiqueta="Correo electrónico" tipo="email" valor={f.email} onChange={set('email')}
            placeholder="tucorreo@gmail.com" inputMode="email" autoComplete="email" />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-tenue">Contraseña</label>
            <div className="relative">
              <input type={ver ? 'text' : 'password'} required autoComplete="new-password"
                className="campo pr-11" value={f.pass} onChange={set('pass')}
                placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setVer((v) => !v)}
                aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="btn-icono absolute right-1 top-1/2 -translate-y-1/2">
                {ver ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Campo etiqueta="Repite la contraseña" tipo={ver ? 'text' : 'password'}
            valor={f.pass2} onChange={set('pass2')} autoComplete="new-password" />

          {/* El consentimiento va desmarcado y como paso aparte: la LOPDP pide
              que sea una acción voluntaria, no una casilla ya marcada. */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-panel2 p-3">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-marca)]" />
            <span className="text-[11px] leading-relaxed text-tenue">
              Soy mayor de {EDAD_MINIMA} años y he leído los{' '}
              <Link href="/legal/terminos" target="_blank" className="text-marca underline">
                Términos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/legal/privacidad" target="_blank" className="text-marca underline">
                Política de Privacidad
              </Link>. Entiendo que el saldo es crédito de tienda y no se devuelve en efectivo.
            </span>
          </label>

          <button disabled={cargando} className="btn btn-primario w-full">
            {cargando ? <><Loader2 size={15} className="animate-spin" /> Creando cuenta…</> : 'Crear cuenta'}
          </button>

          <Separador />
          <BotonGoogle />

          <p className="text-center text-[11px] leading-relaxed text-tenue">
            Al continuar con Google aceptas los{' '}
            <Link href="/legal/terminos" target="_blank" className="underline">Términos</Link> y la{' '}
            <Link href="/legal/privacidad" target="_blank" className="underline">Política de Privacidad</Link>.
          </p>
        </form>

        <p className="mt-5 text-center text-sm text-tenue">
          ¿Ya tienes cuenta? <Link href="/login" className="font-medium text-marca">Ingresa aquí</Link>
        </p>
      </div>
    </div>
  )
}

function Campo({ etiqueta, tipo = 'text', valor, ...resto }: {
  etiqueta: string; tipo?: string; valor: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-tenue">{etiqueta}</label>
      <input {...resto} type={tipo} value={valor} required className="campo" />
    </div>
  )
}
