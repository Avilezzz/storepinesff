import Link from 'next/link'
import { ChevronRight, ShieldAlert, PackageOpen, TrendingUp } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase'
import { usd, fecha } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Metricas = {
  ventas_hoy_cents: number; ventas_mes_cents: number; ordenes_hoy: number
  recargas_pendientes: number; reclamos_abiertos: number; solicitudes_producto: number
  usuarios_total: number
  saldo_en_circulacion: number; stock_total: number
  stock_bajo: { nombre: string; stock: number }[]
}

export default async function AdminResumen() {
  const sb = await supabaseServer()

  type Venta = { numero: string; total_cents: number; created_at: string; profiles: { nombre: string } | null }

  const [{ data: m }, { data: desc }, { data: ult }] = await Promise.all([
    sb.rpc('fn_admin_metricas'),
    sb.rpc('fn_auditoria_saldos'),
    sb.from('orders').select('numero, total_cents, created_at, profiles(nombre)')
      .order('id', { ascending: false }).limit(8),
  ])

  const k = m as Metricas
  const descuadres = desc as unknown[] | null
  const ultimas = ult as unknown as Venta[] | null

  return (
    <>
      <h1 className="titulo mb-4">Resumen</h1>

      {/* Si esto aparece, el balance cacheado no coincide con el libro mayor.
          Nunca debería pasar: algo tocó wallets fuera de las funciones. */}
      {!!descuadres?.length && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-error/40 bg-error/10 p-3.5">
          <ShieldAlert size={17} className="mt-0.5 shrink-0 text-error" />
          <div>
            <p className="text-sm font-medium text-error">
              Descuadre en {descuadres.length} billetera{descuadres.length === 1 ? '' : 's'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-tenue">
              El saldo guardado no coincide con la suma del libro mayor. Revisa antes de seguir operando.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi titulo="Ventas de hoy" valor={usd(k?.ventas_hoy_cents ?? 0)}
          pie={`${k?.ordenes_hoy ?? 0} órdenes`} destacado />
        <Kpi titulo="Ventas del mes" valor={usd(k?.ventas_mes_cents ?? 0)} />
        <Kpi titulo="Saldo en circulación" valor={usd(k?.saldo_en_circulacion ?? 0)} pie="Deuda con clientes" />
        <Kpi titulo="Pines en stock" valor={String(k?.stock_total ?? 0)} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Accion href="/admin/recargas" titulo="Recargas por revisar" n={k?.recargas_pendientes ?? 0} />
        <Accion href="/admin/reclamos" titulo="Reclamos abiertos" n={k?.reclamos_abiertos ?? 0} />
        <Accion href="/admin/solicitudes" titulo="Esperando stock" n={k?.solicitudes_producto ?? 0} />
        <Kpi titulo="Usuarios" valor={String(k?.usuarios_total ?? 0)} />
      </div>

      {!!k?.stock_bajo?.length && (
        <div className="tarjeta mt-4 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-alerta">
            <PackageOpen size={15} /> Stock bajo
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {k.stock_bajo.map((s) => (
              <span key={s.nombre} className="chip bg-alerta/12 text-alerta">
                {s.nombre}: {s.stock}
              </span>
            ))}
          </div>
          <Link href="/admin/codigos" className="btn btn-suave mt-3.5 w-full sm:w-auto">Cargar pines</Link>
        </div>
      )}

      <h2 className="subtitulo mb-3 mt-7">Últimas ventas</h2>
      {!ultimas?.length ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-12 text-center">
          <TrendingUp size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Todavía no hay ventas</p>
        </div>
      ) : (
        <div className="tarjeta divide-y divide-linea">
          {ultimas.map((o) => (
            <div key={o.numero} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="cifra text-sm font-medium">{o.numero}</p>
                <p className="truncate text-xs text-tenue">
                  {o.profiles?.nombre} · {fecha(o.created_at)}
                </p>
              </div>
              <p className="cifra shrink-0 text-sm font-semibold">{usd(o.total_cents)}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Kpi({ titulo, valor, pie, destacado }: { titulo: string; valor: string; pie?: string; destacado?: boolean }) {
  return (
    <div className="tarjeta p-3.5">
      <p className="etiqueta">{titulo}</p>
      <p className={`cifra mt-1 text-xl font-semibold ${destacado ? 'text-marca' : ''}`}>{valor}</p>
      {pie && <p className="mt-0.5 text-[11px] text-tenue">{pie}</p>}
    </div>
  )
}

function Accion({ href, titulo, n }: { href: string; titulo: string; n: number }) {
  return (
    <Link href={href}
      className={`tarjeta group p-3.5 transition hover:border-marca/40 ${n > 0 ? 'border-marca/35' : ''}`}>
      <p className="etiqueta">{titulo}</p>
      <p className={`cifra mt-1 text-xl font-semibold ${n > 0 ? 'text-marca' : ''}`}>{n}</p>
      <p className="mt-0.5 flex items-center gap-0.5 text-[11px] text-tenue">
        {n > 0 ? <>Requiere atención <ChevronRight size={11} /></> : 'Todo al día'}
      </p>
    </Link>
  )
}
