'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, fecha, mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'
import Dialogo from '../ui/Dialogo'

export type Reclamo = {
  id: number; motivo: string; descripcion: string | null; estado: string
  monto_reembolsado_cents: number; nota_admin: string | null; created_at: string
  pin_codes: { codigo: string } | null
  order_items: { producto_nombre: string; precio_unit_cents: number } | null
  profiles: { nombre: string; email: string } | null
}

export default function AdminReclamos(
  { reclamos, error: errorCarga }: { reclamos: Reclamo[]; error: string | null },
) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [aprobando, setAprobando] = useState<Reclamo | null>(null)
  const [rechazando, setRechazando] = useState<Reclamo | null>(null)

  async function resolver(r: Reclamo, aprobar: boolean, nota: string) {
    setOcupado(r.id)
    const { error } = await sb.rpc('fn_reclamo_resolver', {
      p_id: r.id, p_aprobar: aprobar, p_nota: nota || null,
    })
    setOcupado(null)

    if (error) { toast.error(mensajeError(error.message)); return }

    toast.success(aprobar
      ? `${usd(r.order_items?.precio_unit_cents ?? 0)} devueltos a ${r.profiles?.nombre}`
      : 'Reclamo rechazado')
    setAprobando(null)
    setRechazando(null)
    router.refresh()
  }

  const abiertos = reclamos.filter((r) => r.estado === 'ABIERTO')
  const cerrados = reclamos.filter((r) => r.estado !== 'ABIERTO')

  return (
    <>
      <h1 className="titulo mb-4">Reclamos</h1>

      {errorCarga && (
        <p className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-sm text-error">
          No se pudieron cargar los reclamos: {errorCarga}
        </p>
      )}

      {reclamos.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <ShieldCheck size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">No hay reclamos</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {abiertos.map((r) => (
            <div key={r.id} className="tarjeta border-alerta/35 p-4">
              <Cabecera r={r} />
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button onClick={() => setAprobando(r)} disabled={ocupado === r.id}
                  className="btn btn-primario flex-1 sm:flex-none">
                  {ocupado === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Devolver {usd(r.order_items?.precio_unit_cents ?? 0)}
                </button>
                <button onClick={() => setRechazando(r)} disabled={ocupado === r.id}
                  className="btn btn-suave text-error">
                  <X size={15} /> Rechazar
                </button>
              </div>
            </div>
          ))}

          {cerrados.length > 0 && (
            <>
              <p className="etiqueta pt-4">Resueltos</p>
              {cerrados.map((r) => (
                <div key={r.id} className="tarjeta p-4 opacity-65">
                  <Cabecera r={r} />
                  {r.nota_admin && (
                    <p className="mt-2.5 border-t border-linea pt-2.5 text-xs leading-relaxed text-tenue">
                      {r.nota_admin}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <Dialogo
        abierto={!!aprobando}
        titulo="Aprobar reclamo"
        textoConfirmar={`Devolver ${aprobando ? usd(aprobando.order_items?.precio_unit_cents ?? 0) : ''}`}
        campo={{ etiqueta: 'Nota (opcional)', valorInicial: 'Pin defectuoso verificado' }}
        onCerrar={() => setAprobando(null)}
        onConfirmar={async (nota) => { if (aprobando) await resolver(aprobando, true, nota) }}
        descripcion={
          <>Se devolverán <strong className="text-fuerte">{aprobando ? usd(aprobando.order_items?.precio_unit_cents ?? 0) : ''}</strong> a
          la billetera de <strong className="text-fuerte">{aprobando?.profiles?.nombre}</strong> y
          el pin quedará marcado como defectuoso.</>
        }
      />

      <Dialogo
        abierto={!!rechazando}
        titulo="Rechazar reclamo"
        peligro
        textoConfirmar="Rechazar"
        descripcion="El cliente verá el motivo que escribas aquí."
        campo={{ etiqueta: 'Motivo del rechazo', requerido: true, multilinea: true }}
        onCerrar={() => setRechazando(null)}
        onConfirmar={async (nota) => { if (rechazando) await resolver(rechazando, false, nota) }}
      />
    </>
  )
}

function Cabecera({ r }: { r: Reclamo }) {
  const estilo = r.estado === 'ABIERTO' ? 'bg-alerta/12 text-alerta'
    : r.estado === 'APROBADO' ? 'bg-ok/12 text-ok' : 'bg-error/12 text-error'
  const texto = r.estado === 'ABIERTO' ? 'Abierto'
    : r.estado === 'APROBADO' ? `Reembolsado ${usd(r.monto_reembolsado_cents)}` : 'Rechazado'

  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar nombre={r.profiles?.nombre ?? '?'} size={34} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{r.motivo}</p>
          <p className="truncate text-xs text-tenue">
            {r.profiles?.nombre} · {r.order_items?.producto_nombre}
          </p>
          <p className="mt-0.5 text-[11px] text-tenue">{fecha(r.created_at)}</p>
        </div>
        <span className={`chip shrink-0 ${estilo}`}>{texto}</span>
      </div>

      {r.pin_codes && (
        <code className="mt-2.5 block break-all font-mono text-[11px] text-tenue">{r.pin_codes.codigo}</code>
      )}
      {r.descripcion && (
        <p className="mt-2 rounded-lg bg-panel2 px-3 py-2 text-xs leading-relaxed text-tenue">
          “{r.descripcion}”
        </p>
      )}
    </>
  )
}
