import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, Plus, Store, Receipt } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'

export const dynamic = 'force-dynamic'

const ETIQUETA: Record<string, string> = {
  RECARGA: 'Recarga aprobada', COMPRA: 'Compra de pines',
  REEMBOLSO: 'Reembolso', AJUSTE: 'Ajuste manual',
}

const ESTADO = {
  APROBADA:  { txt: 'Aprobada',    clase: 'bg-ok/12 text-ok' },
  RECHAZADA: { txt: 'Rechazada',   clase: 'bg-error/12 text-error' },
  PENDIENTE: { txt: 'En revisión', clase: 'bg-alerta/12 text-alerta' },
} as const

export default async function Billetera() {
  type Movimiento = {
    id: number; tipo: string; amount_cents: number; balance_after_cents: number
    descripcion: string | null; created_at: string
  }
  type Solicitud = {
    id: number; amount_cents: number; banco: string; estado: keyof typeof ESTADO
    nota_admin: string | null; created_at: string
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  const [{ data: wallet }, { data: movRaw }, { data: solRaw }] = await Promise.all([
    sb.from('wallets').select('balance_cents').eq('user_id', user!.id).single(),
    sb.from('wallet_ledger').select('id, tipo, amount_cents, balance_after_cents, descripcion, created_at')
      .order('id', { ascending: false }).limit(40),
    sb.from('topup_requests').select('id, amount_cents, banco, estado, nota_admin, created_at')
      .order('id', { ascending: false }).limit(10),
  ])

  const movimientos = movRaw as Movimiento[] | null
  const solicitudes = solRaw as Solicitud[] | null

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
      <div className="tarjeta aura px-5 py-8 text-center">
        <p className="etiqueta">Saldo disponible</p>
        <p className="cifra mt-1.5 text-4xl font-semibold sm:text-5xl">
          {usd(wallet?.balance_cents ?? 0)}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/recargar" className="btn btn-primario"><Plus size={15} /> Recargar</Link>
          <Link href="/" className="btn btn-suave"><Store size={15} /> Comprar</Link>
        </div>
      </div>

      {!!solicitudes?.length && (
        <>
          <h2 className="subtitulo mb-3 mt-7">Mis solicitudes de recarga</h2>
          <div className="space-y-2">
            {solicitudes.map((s) => {
              const e = ESTADO[s.estado] ?? ESTADO.PENDIENTE
              return (
                <div key={s.id} className="tarjeta p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="cifra text-sm font-medium">{usd(s.amount_cents)}</p>
                      <p className="text-xs text-tenue">{s.banco}</p>
                      <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(s.created_at)}</p>
                    </div>
                    <span className={`chip shrink-0 ${e.clase}`}>{e.txt}</span>
                  </div>
                  {s.nota_admin && (
                    <p className="mt-2.5 border-t border-linea pt-2.5 text-xs leading-relaxed text-tenue">
                      {s.nota_admin}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <h2 className="subtitulo mb-3 mt-7">Movimientos</h2>
      {!movimientos?.length ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-12 text-center">
          <Receipt size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Aún no hay movimientos</p>
        </div>
      ) : (
        <div className="tarjeta divide-y divide-linea">
          {movimientos.map((m) => {
            const positivo = m.amount_cents > 0
            const Icono = positivo ? ArrowDownLeft : ArrowUpRight
            return (
              <div key={m.id} className="flex items-center gap-3 p-3.5">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  positivo ? 'bg-ok/12 text-ok' : 'bg-panel2 text-tenue'}`}>
                  <Icono size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ETIQUETA[m.tipo] ?? m.tipo}</p>
                  {m.descripcion && <p className="truncate text-xs text-tenue">{m.descripcion}</p>}
                  <p className="mt-0.5 text-[11px] text-tenue/60">{fecha(m.created_at)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`cifra text-sm font-semibold ${positivo ? 'text-ok' : ''}`}>
                    {positivo ? '+' : '−'}{usd(Math.abs(m.amount_cents))}
                  </p>
                  <p className="cifra text-[11px] text-tenue">{usd(m.balance_after_cents)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
