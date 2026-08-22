'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Gem, Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import { VERSION_LEGAL, EDAD_MINIMA } from '@/lib/legal'

export default function CompletarPerfil() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  )
}

function Formulario() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const volver = useSearchParams().get('volver') ?? '/'
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Google trae el nombre; solo se pide si vino vacío o de relleno.
  const [pedirNombre, setPedirNombre] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return router.replace('/login')
      if (user.user_metadata?.telefono) return router.replace(volver)

      const { data } = await sb.from('profiles')
        .select('nombre, telefono').eq('id', user.id).maybeSingle()
      const p = data as { nombre: string; telefono: string } | null

      // Quien ya dio su teléfono al registrarse por correo y luego vincula
      // Google llega aquí sin el dato en el metadata: se copia y sigue de largo,
      // en vez de pedirle algo que la base ya sabe.
      if (p?.telefono && p.telefono !== '0000000000') {
        await sb.auth.updateUser({ data: { telefono: p.telefono } })
        return router.replace(volver)
      }

      const actual = p?.nombre ?? ''
      setNombre(actual === 'Usuario' ? '' : actual)
      setPedirNombre(actual === 'Usuario' || actual.trim().length < 3)
    })()
  }, [sb, router, volver])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()

    const tel = telefono.replace(/[\s()-]/g, '')
    if (!/^(\+593\d{9}|0\d{9})$/.test(tel)) return toast.error('Teléfono inválido. Usa 09XXXXXXXX.')
    if (pedirNombre && nombre.trim().length < 3) return toast.error('Escribe tu nombre completo.')
    if (!acepta) return toast.error('Debes aceptar los términos y la política de privacidad.')

    setGuardando(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setGuardando(false); return router.replace('/login') }

    const cambios: { telefono: string; nombre?: string } = { telefono: tel }
    if (pedirNombre) cambios.nombre = nombre.trim()

    const { error } = await sb.from('profiles').update(cambios).eq('id', user.id)
    if (error) {
      setGuardando(false)
      return toast.error(mensajeError(error.message))
    }

    // El teléfono también va al metadata de la sesión: el middleware lo lee de
    // ahí para saber si el perfil está completo, sin consultar la base.
    await sb.auth.updateUser({ data: { telefono: tel, ...(pedirNombre ? { nombre: nombre.trim() } : {}) } })
    await sb.rpc('fn_aceptar_terminos', { p_version: VERSION_LEGAL })

    setGuardando(false)
    toast.success('¡Listo! Tu cuenta quedó completa.')
    router.replace(volver)
    router.refresh()
  }

  return (
    <div className="aura flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-marca text-sobre-marca">
            <Gem size={21} strokeWidth={2.4} />
          </span>
          <h1 className="titulo">Un dato más</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-tenue">
            Necesitamos tu teléfono para avisarte si hay algún problema con una
            recarga o con tus pines.
          </p>
        </div>

        <form onSubmit={guardar} className="tarjeta space-y-4 p-5">
          {pedirNombre && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-tenue">Nombre completo</label>
              <input className="campo" required autoComplete="name" placeholder="Luis Avilez"
                value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-tenue">Teléfono</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tenue" />
              <input className="campo pl-9" required autoFocus inputMode="tel" autoComplete="tel"
                placeholder="0987654321"
                value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>

          {/* Quien entra con Google no pasa por el registro, así que su
              consentimiento se recoge aquí: es el único paso obligatorio que
              atraviesa antes de poder comprar. */}
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
              </Link>.
            </span>
          </label>

          <button disabled={guardando} className="btn btn-primario w-full">
            {guardando ? <><Loader2 size={15} className="animate-spin" /> Guardando…</> : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
