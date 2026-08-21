'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Check, X, Inbox, Loader2, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, fecha, soloFecha, mensajeError } from '@/lib/format'
import Avatar from '../ui/Avatar'
import Dialogo from '../ui/Dialogo'

export type Solicitud = {
  id: number; amount_cents: number; banco: string; numero_referencia: string
  fecha_transferencia: string; comprobante_path: string; estado: string
  nota_usuario: string | null; nota_admin: string | null; created_at: string
  profiles: { nombre: string; email: string; telefono: string } | null
}

const FILTROS = [['PENDIENTE', 'Pendientes'], ['APROBADA', 'Aprobadas'], ['RECHAZADA', 'Rechazadas']]

export default function AdminRecargas(
  { solicitudes, estado, error: errorCarga }:
  { solicitudes: Solicitud[]; estado: string; error: string | null },
) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [viendo, setViendo] = useState<string | null>(null)
  const [aprobando, setAprobando] = useState<Solicitud | null>(null)
  const [rechazando, setRechazando] = useState<Solicitud | null>(null)

  async function verComprobante(path: string) {
    // El bucket es privado: se firma una URL temporal de 5 minutos.
    const { data, error } = await sb.storage.from('comprobantes').createSignedUrl(path, 300)
    if (error || !data?.signedUrl) return toast.error('No se pudo abrir el comprobante.')
    setViendo(data.signedUrl)
  }

  async function aprobar() {
    if (!aprobando) return
    setOcupado(aprobando.id)
    const { error } = await sb.rpc('fn_topup_aprobar', { p_id: aprobando.id, p_nota: null })
    setOcupado(null)

    if (error) { toast.error(mensajeError(error.message)); return }

    toast.success(`${usd(aprobando.amount_cents)} acreditados a ${aprobando.profiles?.nombre}`)
    setAprobando(null)
    router.refresh()
  }

  async function rechazar(motivo: string) {
    if (!rechazando) return
    setOcupado(rechazando.id)
    const { error } = await sb.rpc('fn_topup_rechazar', { p_id: rechazando.id, p_nota: motivo })
    setOcupado(null)

    if (error) { toast.error(mensajeError(error.message)); return }

    toast('Solicitud rechazada')
    setRechazando(null)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Recargas</h1>
        <div className="flex gap-1">
          {FILTROS.map(([v, txt]) => (
            <Link key={v} href={`/admin/recargas?estado=${v}`}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                estado === v ? 'bg-marca/12 text-marca' : 'text-tenue hover:bg-panel2'}`}>
              {txt}
            </Link>
          ))}
        </div>
      </div>

      {errorCarga && (
        <p className="mb-4 rounded-lg bg-error/10 px-3 py-2.5 text-sm text-error">
          No se pudieron cargar las solicitudes: {errorCarga}
        </p>
      )}

      {solicitudes.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <Inbox size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">No hay solicitudes en este estado</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {solicitudes.map((s) => (
            <div key={s.id} className="tarjeta p-4">
              <div className="flex items-start gap-3">
                <Avatar nombre={s.profiles?.nombre ?? '?'} size={36} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.profiles?.nombre}</p>
                  <p className="truncate text-xs text-tenue">{s.profiles?.email}</p>
                  <p className="text-xs text-tenue">{s.profiles?.telefono}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="cifra text-xl font-semibold text-marca">{usd(s.amount_cents)}</p>
                  <p className="text-[11px] text-tenue">#{s.id}</p>
                </div>
              </div>

              <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-linea pt-3.5 text-sm sm:grid-cols-4">
                <D k="Banco" v={s.banco} icono={<Landmark size={12} />} />
                <D k="Referencia" v={s.numero_referencia} mono />
                <D k="Transferido" v={soloFecha(s.fecha_transferencia)} />
                <D k="Solicitado" v={fecha(s.created_at)} />
              </dl>

              {s.nota_usuario && (
                <p className="mt-3 rounded-lg bg-panel2 px-3 py-2 text-xs leading-relaxed text-tenue">
                  “{s.nota_usuario}”
                </p>
              )}
              {s.nota_admin && (
                <p className="mt-3 rounded-lg bg-panel2 px-3 py-2 text-xs leading-relaxed">
                  <span className="text-tenue">Nota: </span>{s.nota_admin}
                </p>
              )}

              <div className="mt-3.5 flex flex-wrap gap-2">
                <button onClick={() => verComprobante(s.comprobante_path)} className="btn btn-suave flex-1 sm:flex-none">
                  <FileText size={15} /> Comprobante
                </button>

                {s.estado === 'PENDIENTE' && (
                  <>
                    <button onClick={() => setAprobando(s)} disabled={ocupado === s.id}
                      className="btn btn-primario flex-1 sm:flex-none">
                      {ocupado === s.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Aprobar
                    </button>
                    <button onClick={() => setRechazando(s)} disabled={ocupado === s.id}
                      className="btn btn-suave text-error">
                      <X size={15} /> Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialogo
        abierto={!!aprobando}
        titulo="Confirmar acreditación"
        textoConfirmar={`Acreditar ${aprobando ? usd(aprobando.amount_cents) : ''}`}
        onCerrar={() => setAprobando(null)}
        onConfirmar={aprobar}
        descripcion={
          <>Se sumarán <strong className="text-fuerte">{aprobando ? usd(aprobando.amount_cents) : ''}</strong> a
          la billetera de <strong className="text-fuerte">{aprobando?.profiles?.nombre}</strong>.
          El movimiento queda asentado en el libro mayor y no se puede deshacer.</>
        }
      />

      <Dialogo
        abierto={!!rechazando}
        titulo="Rechazar solicitud"
        peligro
        textoConfirmar="Rechazar"
        descripcion="El cliente verá el motivo que escribas aquí."
        campo={{ etiqueta: 'Motivo del rechazo', placeholder: 'Ej. el comprobante no es legible', requerido: true, multilinea: true }}
        onCerrar={() => setRechazando(null)}
        onConfirmar={rechazar}
      />

      {viendo && (
        <div className="fixed inset-0 z-100 grid place-items-center bg-black/85 p-4" onClick={() => setViendo(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-panel p-2"
            onClick={(e) => e.stopPropagation()}>
            {viendo.includes('.pdf') ? (
              <iframe src={viendo} className="h-[75vh] w-full rounded-lg" title="Comprobante" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viendo} alt="Comprobante de transferencia" className="w-full rounded-lg" />
            )}
            <button onClick={() => setViendo(null)} className="btn btn-suave mt-2 w-full">Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}

function D({ k, v, mono, icono }: { k: string; v: string; mono?: boolean; icono?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="etiqueta flex items-center gap-1">{icono}{k}</dt>
      <dd className={`truncate text-xs font-medium ${mono ? 'font-mono' : ''}`}>{v}</dd>
    </div>
  )
}
