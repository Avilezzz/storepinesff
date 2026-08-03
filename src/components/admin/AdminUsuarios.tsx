'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Wallet, UsersRound, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, fecha, aCentavos, mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'

export type UsuarioFila = {
  id: string; nombre: string; email: string; telefono: string
  rol: 'CLIENTE' | 'ADMIN'; activo: boolean; created_at: string
  wallets: { balance_cents: number } | null
}

export default function AdminUsuarios({ usuarios, q }: { usuarios: UsuarioFila[]; q: string }) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState(q)
  const [ajustando, setAjustando] = useState<UsuarioFila | null>(null)

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/usuarios${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''}`)
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Usuarios</h1>
        <form onSubmit={buscar} className="relative flex-1 sm:max-w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tenue" />
          <input className="campo pl-9 text-sm" placeholder="Nombre, correo o teléfono"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </form>
      </div>

      {usuarios.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <UsersRound size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Sin resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="tarjeta flex items-center gap-3 p-3.5">
              <Avatar nombre={u.nombre} size={38} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{u.nombre}</p>
                  {u.rol === 'ADMIN' && <span className="chip bg-marca/12 text-marca">Admin</span>}
                </div>
                <p className="truncate text-xs text-tenue">{u.email}</p>
                <p className="text-[11px] text-tenue/70">{u.telefono} · {fecha(u.created_at)}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="cifra text-sm font-semibold">{usd(u.wallets?.balance_cents ?? 0)}</p>
                <button onClick={() => setAjustando(u)}
                  className="enlace mt-0.5 text-[11px] hover:text-marca">
                  <Wallet size={11} /> Ajustar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ajustando && (
        <ModalAjuste usuario={ajustando} onCerrar={() => setAjustando(null)}
          onListo={() => { setAjustando(null); router.refresh() }} />
      )}
    </>
  )
}

function ModalAjuste({ usuario, onCerrar, onListo }: {
  usuario: UsuarioFila; onCerrar: () => void; onListo: () => void
}) {
  const sb = supabaseBrowser()
  const [signo, setSigno] = useState<1 | -1>(1)
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cents = aCentavos(monto)
  const saldo = usuario.wallets?.balance_cents ?? 0
  const resultante = saldo + (cents ?? 0) * signo

  async function aplicar() {
    if (cents === null || cents <= 0)  return toast.error('Monto inválido.')
    if (!motivo.trim())                return toast.error('Escribe el motivo del ajuste.')
    if (signo === -1 && cents > saldo) return toast.error('El usuario no tiene saldo suficiente.')

    setGuardando(true)
    const { error } = await sb.rpc('fn_ajustar_saldo', {
      p_user_id: usuario.id, p_amount_cents: cents * signo, p_motivo: motivo.trim(),
    })
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(`Saldo de ${usuario.nombre}: ${usd(resultante)}`)
    onListo()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={usuario.nombre} size={38} />
          <div>
            <h3 className="text-base font-semibold tracking-tight">Ajustar saldo</h3>
            <p className="cifra text-xs text-tenue">{usuario.nombre} · {usd(saldo)} actual</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setSigno(1)}
            className={`btn flex-1 ${signo === 1 ? 'btn-primario' : 'btn-suave'}`}>
            <Plus size={15} /> Acreditar
          </button>
          <button onClick={() => setSigno(-1)}
            className={`btn flex-1 ${signo === -1 ? 'btn-peligro' : 'btn-suave'}`}>
            <Minus size={15} /> Descontar
          </button>
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-xs font-medium text-tenue">Monto (USD)</label>
          <input className="campo" inputMode="decimal" placeholder="5.00" autoFocus
            value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>

        <div className="mt-3.5">
          <label className="mb-1.5 block text-xs font-medium text-tenue">
            Motivo (queda en el libro mayor)
          </label>
          <input className="campo" placeholder="Ej. corrección de recarga duplicada"
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicar()} />
        </div>

        {cents !== null && cents > 0 && (
          <p className="mt-3.5 flex items-center justify-between rounded-lg bg-panel2 px-3 py-2.5 text-sm">
            <span className="text-tenue">Saldo resultante</span>
            <span className={`cifra font-semibold ${resultante < 0 ? 'text-error' : ''}`}>
              {usd(Math.max(0, resultante))}
            </span>
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onCerrar} className="btn btn-suave flex-1">Cancelar</button>
          <button onClick={aplicar} disabled={guardando} className="btn btn-primario flex-1">
            {guardando ? 'Aplicando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
