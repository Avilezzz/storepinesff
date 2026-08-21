'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UsersRound, ChevronRight } from 'lucide-react'
import { usd, fecha } from '@/lib/format'
import Avatar from '../ui/Avatar'

export type ClienteFila = {
  id: string; nombre: string; email: string; telefono: string
  rol: 'CLIENTE' | 'ADMIN'; created_at: string
  saldo_cents: number; gastado_cents: number; recargado_cents: number
  ordenes: number; ultima_compra: string | null
}

export type Totales = { clientes: number; saldo_cents: number; vendido_cents: number }

const ORDENES = [
  { id: 'reciente',  txt: 'Recientes' },
  { id: 'gasto',     txt: 'Más gastan' },
  { id: 'saldo',     txt: 'Con saldo' },
  { id: 'actividad', txt: 'Última compra' },
] as const

const DIA = 86_400_000

/** Etiqueta de un vistazo: a quién atender, a quién despertar, a quién cuidar. */
function estado(c: ClienteFila): { txt: string; clase: string } | null {
  const nuevo = Date.now() - new Date(c.created_at).getTime() < 7 * DIA
  if (c.ordenes === 0) return nuevo
    ? { txt: 'Nuevo', clase: 'bg-marca/12 text-marca' }
    : { txt: 'Sin compras', clase: 'bg-alerta/12 text-alerta' }
  if (c.ultima_compra && Date.now() - new Date(c.ultima_compra).getTime() > 30 * DIA)
    return { txt: 'Dormido', clase: 'bg-panel2 text-tenue' }
  return null
}

export default function AdminUsuarios({ clientes, totales, q, orden }: {
  clientes: ClienteFila[]; totales: Totales; q: string; orden: string
}) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState(q)

  function ir(nuevo: { q?: string; orden?: string }) {
    const p = new URLSearchParams()
    const texto = nuevo.q ?? busqueda
    const o = nuevo.orden ?? orden
    if (texto.trim()) p.set('q', texto.trim())
    if (o !== 'reciente') p.set('orden', o)
    router.push(`/admin/usuarios${p.toString() ? `?${p}` : ''}`)
  }

  return (
    <>
      <h1 className="titulo mb-4">Clientes</h1>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Kpi etiqueta="Clientes" valor={String(totales.clientes)} />
        <Kpi etiqueta="Vendido" valor={usd(totales.vendido_cents)} />
        {/* Saldo sin gastar: es dinero cobrado que todavía debes en pines. */}
        <Kpi etiqueta="Saldo suelto" valor={usd(totales.saldo_cents)} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ir({}) }} className="relative mb-2.5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tenue" />
        <input className="campo pl-9 text-sm" placeholder="Nombre, correo o teléfono"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </form>

      <div className="sin-barra mb-4 flex gap-1.5 overflow-x-auto">
        {ORDENES.map((o) => (
          <button key={o.id} onClick={() => ir({ orden: o.id })}
            className={`chip shrink-0 border px-2.5 py-1.5 transition ${
              orden === o.id ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
            {o.txt}
          </button>
        ))}
      </div>

      {clientes.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <UsersRound size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Sin resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map((c) => {
            const e = estado(c)
            return (
              <Link key={c.id} href={`/admin/usuarios/${c.id}`}
                className="tarjeta flex items-center gap-3 p-3.5 transition hover:border-marca/40">
                <Avatar nombre={c.nombre} size={38} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{c.nombre}</p>
                    {c.rol === 'ADMIN' && <span className="chip bg-marca/12 text-marca">Admin</span>}
                    {e && <span className={`chip shrink-0 ${e.clase}`}>{e.txt}</span>}
                  </div>
                  <p className="truncate text-xs text-tenue">{c.email}</p>
                  <p className="text-[11px] text-tenue/70">
                    {c.ordenes === 0 ? `Se registró ${fecha(c.created_at)}`
                      : `${c.ordenes} compra${c.ordenes === 1 ? '' : 's'} · última ${fecha(c.ultima_compra!)}`}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="cifra text-sm font-semibold">{usd(c.gastado_cents)}</p>
                  <p className="cifra text-[11px] text-tenue">{usd(c.saldo_cents)} de saldo</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-tenue" />
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}

function Kpi({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="tarjeta px-3 py-3 text-center">
      <p className="etiqueta">{etiqueta}</p>
      <p className="cifra mt-1 text-base font-semibold sm:text-lg">{valor}</p>
    </div>
  )
}
