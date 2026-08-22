'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, Check, X, Loader2, Mail, Phone, User, Wallet, Package,
  ShieldCheck, AlertCircle, LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, mensajeError } from '@/lib/format'
import Avatar from './ui/Avatar'

export type Perfil = {
  nombre: string
  telefono: string
  email: string
  rol: 'CLIENTE' | 'ADMIN'
  acepta_novedades: boolean
}

/** Marcador que deja el registro con Google, que no entrega teléfono. */
const SIN_TELEFONO = '0000000000'

export default function CuentaUI({ perfil, saldo, compras, proveedores }: {
  perfil: Perfil
  saldo: number
  compras: number
  proveedores: string[]
}) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [f, setF] = useState({ nombre: perfil.nombre, telefono: perfil.telefono === SIN_TELEFONO ? '' : perfil.telefono })
  const [guardando, setGuardando] = useState(false)
  const [novedades, setNovedades] = useState(perfil.acepta_novedades)

  /** Se pinta el cambio de inmediato y se revierte si el servidor lo rechaza:
   *  un interruptor que tarda en moverse se siente roto. */
  async function cambiarNovedades(valor: boolean) {
    setNovedades(valor)
    const { error } = await sb.rpc('fn_novedades_preferencia', { p_acepta: valor })
    if (error) { setNovedades(!valor); return toast.error(mensajeError(error.message)) }
    toast.success(valor ? 'Te avisaremos de las novedades.' : 'Ya no recibirás novedades.')
  }

  const faltaTelefono = perfil.telefono === SIN_TELEFONO
  const conGoogle = proveedores.includes('google')

  async function guardar() {
    const tel = f.telefono.replace(/[\s()-]/g, '')
    if (f.nombre.trim().length < 3)         return toast.error('Escribe tu nombre completo.')
    if (!/^(\+593\d{9}|0\d{9})$/.test(tel)) return toast.error('Teléfono inválido. Usa 09XXXXXXXX.')

    setGuardando(true)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { setGuardando(false); return router.replace('/login') }

    const { error } = await sb.from('profiles')
      .update({ nombre: f.nombre.trim(), telefono: tel }).eq('id', user.id)

    if (error) {
      setGuardando(false)
      return toast.error(mensajeError(error.message))
    }

    // El teléfono también va al metadata: el middleware lo lee de ahí para
    // saber si el perfil está completo, sin consultar la base en cada request.
    await sb.auth.updateUser({ data: { nombre: f.nombre.trim(), telefono: tel } })

    setGuardando(false)
    setEditando(false)
    toast.success('Datos actualizados')
    router.refresh()
  }

  function cancelar() {
    setF({ nombre: perfil.nombre, telefono: perfil.telefono === SIN_TELEFONO ? '' : perfil.telefono })
    setEditando(false)
  }

  async function salir() {
    await sb.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-9">
      <h1 className="titulo mb-5">Mi cuenta</h1>

      {faltaTelefono && !editando && (
        <div className="tarjeta mb-3 flex flex-wrap items-center gap-3 border-alerta/40 bg-alerta/8 p-3.5">
          <AlertCircle size={17} className="shrink-0 text-alerta" />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-alerta">
            Falta tu teléfono. Lo necesitamos para avisarte si hay un problema
            con una recarga o con tus pines: sin él no puedes comprar.
          </p>
          <button onClick={() => setEditando(true)} className="btn btn-primario">Agregarlo</button>
        </div>
      )}

      <div className="tarjeta p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <Avatar nombre={perfil.nombre} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="subtitulo truncate">{perfil.nombre}</p>
              {perfil.rol === 'ADMIN' && (
                <span className="chip bg-marca/12 text-marca"><ShieldCheck size={11} /> Admin</span>
              )}
            </div>
          </div>

          {!editando && (
            <button onClick={() => setEditando(true)} className="btn btn-suave shrink-0">
              <Pencil size={14} /> Editar
            </button>
          )}
        </div>

        <div className="mt-4 border-t border-linea pt-4">
          {editando ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-tenue">Nombre completo</label>
                <input className="campo" autoComplete="name" value={f.nombre}
                  onChange={(e) => setF({ ...f, nombre: e.target.value })} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-tenue">Teléfono</label>
                <input className="campo" inputMode="tel" autoComplete="tel" placeholder="0987654321"
                  autoFocus={faltaTelefono} value={f.telefono}
                  onChange={(e) => setF({ ...f, telefono: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar() }} />
                <p className="mt-1.5 text-[11px] text-tenue">Celular de Ecuador: 09XXXXXXXX</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-tenue">Correo electrónico</label>
                <input className="campo opacity-60" value={perfil.email} disabled />
                <p className="mt-1.5 text-[11px] text-tenue">
                  El correo no se puede cambiar: es la llave de tu cuenta y de tu saldo.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={cancelar} className="btn btn-suave flex-1"><X size={15} /> Cancelar</button>
                <button onClick={guardar} disabled={guardando} className="btn btn-primario flex-1">
                  {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-3">
              <Dato icono={<User size={14} />} k="Nombre" v={perfil.nombre} />
              <Dato icono={<Mail size={14} />} k="Correo" v={perfil.email} />
              <Dato icono={<Phone size={14} />} k="Teléfono"
                v={faltaTelefono ? 'Sin registrar' : perfil.telefono}
                alerta={faltaTelefono} />
              <Dato icono={<ShieldCheck size={14} />} k="Acceso"
                v={conGoogle
                    ? proveedores.length > 1 ? 'Google y contraseña' : 'Cuenta de Google'
                    : 'Correo y contraseña'} />
            </dl>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/billetera" className="tarjeta p-4 transition hover:border-marca/40">
          <p className="etiqueta flex items-center gap-1.5"><Wallet size={12} /> Saldo</p>
          <p className="cifra mt-1 text-xl font-semibold text-marca">{usd(saldo)}</p>
        </Link>
        <Link href="/mis-compras" className="tarjeta p-4 transition hover:border-marca/40">
          <p className="etiqueta flex items-center gap-1.5"><Package size={12} /> Compras</p>
          <p className="cifra mt-1 text-xl font-semibold">{compras}</p>
        </Link>
      </div>

      <div className="tarjeta mt-3 flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Novedades por correo</p>
          <p className="mt-0.5 text-xs leading-relaxed text-tenue">
            Avisos de stock nuevo y noticias de la tienda. Los correos de tus compras
            y recargas llegan siempre.
          </p>
        </div>
        <Interruptor activo={novedades} onCambio={cambiarNovedades} />
      </div>

      <button onClick={salir} className="btn btn-suave mt-3 w-full text-error">
        <LogOut size={15} /> Cerrar sesión
      </button>
    </div>
  )
}

function Interruptor({ activo, onCambio }: { activo: boolean; onCambio: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={activo} onClick={() => onCambio(!activo)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? 'bg-marca' : 'bg-panel2 border border-linea'}`}>
      <span className={`absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
        activo ? 'left-[calc(100%-1.25rem)]' : 'left-[3px]'}`} />
    </button>
  )
}

function Dato({ icono, k, v, alerta = false }: {
  icono: React.ReactNode; k: string; v: string; alerta?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-tenue">{icono} {k}</dt>
      <dd className={`min-w-0 truncate text-sm font-medium ${alerta ? 'text-alerta' : ''}`}>{v}</dd>
    </div>
  )
}
