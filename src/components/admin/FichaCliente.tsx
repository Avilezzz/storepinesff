'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Wallet, Mail, MessageCircle, Package, Receipt,
  Bell, ShoppingBag, AlertTriangle,
} from 'lucide-react'
import { usd, fecha } from '@/lib/format'
import Avatar from '../ui/Avatar'
import ImagenProducto from '../ImagenProducto'
import ModalAjuste from './ModalAjuste'
import ModalCorreo from './ModalCorreo'

export type Cliente = {
  perfil: {
    id: string; nombre: string; email: string; telefono: string
    rol: 'CLIENTE' | 'ADMIN'; activo: boolean; created_at: string; saldo_cents: number
  }
  resumen: {
    gastado_cents: number; ordenes: number; pines: number
    primera_compra: string | null; ultima_compra: string | null
    recargado_cents: number; recargas_pendientes: number; reclamos: number
  }
  productos: { producto_nombre: string; imagen_url: string | null
    unidades: number; gastado_cents: number; ultima_vez: string }[]
  compras: { id: number; numero: string; total_cents: number
    estado: string; created_at: string; detalle: string | null }[]
  movimientos: { id: number; tipo: string; amount_cents: number
    balance_after_cents: number; descripcion: string | null; created_at: string }[]
  recargas: { id: number; amount_cents: number; banco: string
    estado: string; nota_admin: string | null; created_at: string }[]
  esperando: { id: number; nombre: string; created_at: string }[]
  correos: { asunto: string; motivo: string | null; created_at: string }[]
}

const DIA = 86_400_000

export default function FichaCliente({ cliente }: { cliente: Cliente }) {
  const router = useRouter()
  const [ajustando, setAjustando] = useState(false)
  const [escribiendo, setEscribiendo] = useState(false)

  const { perfil: p, resumen: r } = cliente
  const base = { id: p.id, nombre: p.nombre, email: p.email, saldo_cents: p.saldo_cents }

  const ticket = r.ordenes > 0 ? Math.round(r.gastado_cents / r.ordenes) : 0
  const dias = r.ultima_compra
    ? Math.floor((Date.now() - new Date(r.ultima_compra).getTime()) / DIA) : null
  const tel = p.telefono && p.telefono !== '0000000000' ? p.telefono : null

  // La barra del ranking se mide contra el producto que más gasto acumula.
  const tope = cliente.productos[0]?.gastado_cents ?? 1

  return (
    <>
      <Link href="/admin/usuarios" className="enlace"><ArrowLeft size={14} /> Clientes</Link>

      <div className="tarjeta mt-4 p-5">
        <div className="flex items-start gap-3.5">
          <Avatar nombre={p.nombre} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">{p.nombre}</h1>
              {p.rol === 'ADMIN' && <span className="chip bg-marca/12 text-marca">Admin</span>}
              {!p.activo && <span className="chip bg-error/12 text-error">Inactivo</span>}
            </div>
            <p className="truncate text-sm text-tenue">{p.email}</p>
            <p className="text-xs text-tenue/70">
              {tel ?? 'Sin teléfono'} · cliente desde {fecha(p.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setAjustando(true)} className="btn btn-suave flex-1 sm:flex-none">
            <Wallet size={15} /> Ajustar saldo
          </button>
          <button onClick={() => setEscribiendo(true)} className="btn btn-suave flex-1 sm:flex-none">
            <Mail size={15} /> Escribir
          </button>
          {tel && (
            <a href={`https://wa.me/593${tel.replace(/^0|^\+593/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-suave flex-1 sm:flex-none">
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {(r.recargas_pendientes > 0 || r.reclamos > 0) && (
        <div className="tarjeta mt-2.5 flex items-center gap-2.5 border-alerta/40 p-3.5 text-sm">
          <AlertTriangle size={16} className="shrink-0 text-alerta" />
          <p>
            {r.recargas_pendientes > 0 && (
              <>Tiene <b>{r.recargas_pendientes}</b> recarga{r.recargas_pendientes === 1 ? '' : 's'} sin revisar. </>
            )}
            {r.reclamos > 0 && (
              <>Ha abierto <b>{r.reclamos}</b> reclamo{r.reclamos === 1 ? '' : 's'}.</>
            )}
          </p>
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi etiqueta="Saldo" valor={usd(p.saldo_cents)} />
        <Kpi etiqueta="Ha gastado" valor={usd(r.gastado_cents)} />
        <Kpi etiqueta="Ha recargado" valor={usd(r.recargado_cents)} />
        <Kpi etiqueta="Compra media" valor={r.ordenes ? usd(ticket) : '—'}
          nota={r.ordenes ? `${r.ordenes} compra${r.ordenes === 1 ? '' : 's'} · ${r.pines} pines` : 'Sin compras'} />
      </div>

      {dias !== null && (
        <p className="mt-2 text-center text-xs text-tenue">
          {dias === 0 ? 'Compró hoy' : `Hace ${dias} día${dias === 1 ? '' : 's'} que no compra`}
        </p>
      )}

      {/* El ranking es el dato que hace útil esta ficha: dice qué ofrecerle. */}
      <Seccion titulo="Qué consume" Icono={ShoppingBag} vacio="Todavía no ha comprado nada"
        hay={cliente.productos.length > 0}>
        <div className="tarjeta divide-y divide-linea">
          {cliente.productos.map((x) => (
            <div key={x.producto_nombre} className="flex items-center gap-3 p-3.5">
              <ImagenProducto url={x.imagen_url} alt={x.producto_nombre}
                sizes="44px" iconoSize={14} className="h-11 w-8.5 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{x.producto_nombre}</p>
                <p className="text-[11px] text-tenue">
                  {x.unidades} pin{x.unidades === 1 ? '' : 'es'} · última vez {fecha(x.ultima_vez)}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel2">
                  <div className="h-full rounded-full bg-marca"
                    style={{ width: `${Math.max(6, (x.gastado_cents / tope) * 100)}%` }} />
                </div>
              </div>
              <p className="cifra shrink-0 text-sm font-semibold">{usd(x.gastado_cents)}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Compras" Icono={Package} vacio="Sin compras" hay={cliente.compras.length > 0}>
        <div className="tarjeta divide-y divide-linea">
          {cliente.compras.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="cifra text-sm font-medium">{o.numero}</p>
                  {o.estado !== 'COMPLETADA' && (
                    <span className="chip bg-alerta/12 text-alerta">{o.estado}</span>
                  )}
                </div>
                <p className="truncate text-xs text-tenue">{o.detalle}</p>
                <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(o.created_at)}</p>
              </div>
              <p className="cifra shrink-0 text-sm font-semibold">{usd(o.total_cents)}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Movimientos" Icono={Receipt} vacio="Sin movimientos"
        hay={cliente.movimientos.length > 0}>
        <div className="tarjeta divide-y divide-linea">
          {cliente.movimientos.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{m.descripcion ?? m.tipo}</p>
                <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(m.created_at)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`cifra text-sm font-semibold ${m.amount_cents > 0 ? 'text-ok' : ''}`}>
                  {m.amount_cents > 0 ? '+' : '−'}{usd(Math.abs(m.amount_cents))}
                </p>
                <p className="cifra text-[11px] text-tenue">{usd(m.balance_after_cents)}</p>
              </div>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Recargas" Icono={Wallet} vacio="Nunca ha recargado"
        hay={cliente.recargas.length > 0}>
        <div className="tarjeta divide-y divide-linea">
          {cliente.recargas.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="cifra text-sm font-medium">{usd(t.amount_cents)}</p>
                <p className="truncate text-xs text-tenue">{t.banco}</p>
                <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(t.created_at)}</p>
              </div>
              <span className={`chip shrink-0 ${
                t.estado === 'APROBADA'  ? 'bg-ok/12 text-ok'
                : t.estado === 'RECHAZADA' ? 'bg-error/12 text-error'
                : 'bg-alerta/12 text-alerta'}`}>
                {t.estado}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {cliente.esperando.length > 0 && (
        <Seccion titulo="Está esperando" Icono={Bell} vacio="" hay>
          <div className="tarjeta divide-y divide-linea">
            {cliente.esperando.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                <span className="truncate">{e.nombre}</span>
                <span className="shrink-0 text-[11px] text-tenue">{fecha(e.created_at)}</span>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {cliente.correos.length > 0 && (
        <Seccion titulo="Correos enviados" Icono={Mail} vacio="" hay>
          <div className="tarjeta divide-y divide-linea">
            {cliente.correos.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{c.asunto}</span>
                <span className="shrink-0 text-[11px] text-tenue">{fecha(c.created_at)}</span>
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {ajustando && (
        <ModalAjuste cliente={base} onCerrar={() => setAjustando(false)}
          onListo={() => { setAjustando(false); router.refresh() }} />
      )}
      {escribiendo && (
        <ModalCorreo cliente={base} onCerrar={() => setEscribiendo(false)} />
      )}
    </>
  )
}

function Kpi({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div className="tarjeta px-3.5 py-3">
      <p className="etiqueta">{etiqueta}</p>
      <p className="cifra mt-1 text-lg font-semibold">{valor}</p>
      {nota && <p className="mt-0.5 text-[11px] text-tenue/70">{nota}</p>}
    </div>
  )
}

function Seccion({ titulo, Icono, vacio, hay, children }: {
  titulo: string; Icono: typeof Package; vacio: string; hay: boolean; children: React.ReactNode
}) {
  return (
    <>
      <h2 className="subtitulo mb-3 mt-7 flex items-center gap-2">
        <Icono size={15} className="text-tenue" /> {titulo}
      </h2>
      {hay ? children : (
        <div className="tarjeta px-6 py-8 text-center text-sm text-tenue">{vacio}</div>
      )}
    </>
  )
}
