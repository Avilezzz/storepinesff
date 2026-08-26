'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Pencil, Trash2, Check, Loader2, Sparkles, Zap, Inbox, MessageSquare, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { fecha, mensajeError } from '@/lib/format'
import { ACCIONES } from '@/lib/asistente'
import Dialogo from '../ui/Dialogo'

export type Kb = {
  id: number
  pregunta: string
  respuesta: string
  claves: string[]
  acciones: string[]
  activo: boolean
  orden: number
}

export type Pendiente = {
  id: number
  pregunta: string
  respuesta: string
  cliente: string
  user_id: string
  creado: string
}

export type MetricasAsistente = {
  hoy: number
  con_ia: number
  con_basico: number
  pendientes: number
  clientes: number
}

export default function AdminAsistente({
  kb, pendientes, metricas,
}: { kb: Kb[]; pendientes: Pendiente[]; metricas: MetricasAsistente }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState<Kb | 'NUEVO' | null>(null)
  const [semilla, setSemilla] = useState('')
  const [borrar, setBorrar] = useState<Kb | null>(null)

  async function atendida(p: Pendiente) {
    const { error } = await sb.from('assistant_messages')
      .update({ sin_resolver: false }).eq('id', p.id)
    if (error) return toast.error(mensajeError(error.message))
    toast('Marcada como atendida')
    router.refresh()
  }

  /** Del pendiente al formulario: la pregunta real del cliente ya escrita. */
  function responder(p: Pendiente) {
    setSemilla(p.pregunta)
    setForm('NUEVO')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function alternar(e: Kb) {
    const { error } = await sb.from('assistant_kb').update({ activo: !e.activo }).eq('id', e.id)
    if (error) return toast.error(mensajeError(error.message))
    router.refresh()
  }

  async function eliminar(e: Kb) {
    const { error } = await sb.from('assistant_kb').delete().eq('id', e.id)
    if (error) return toast.error(mensajeError(error.message))
    setBorrar(null)
    toast.success('Respuesta eliminada')
    router.refresh()
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="titulo">Asistente</h1>
        <button
          onClick={() => { setSemilla(''); setForm(form ? null : 'NUEVO') }}
          className="btn btn-suave"
        >
          {form ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nueva respuesta</>}
        </button>
      </div>
      <p className="mb-4 text-sm text-tenue">
        Estas respuestas son la fuente del asistente: se las pasamos al modelo y son
        también lo que contesta el modo básico cuando el modelo no está disponible.
        Las conversaciones se borran solas a las 24 horas —salvo las que quedaron
        sin responder, que esperan aquí— así que estos números son del día.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi Icono={MessageSquare} etiqueta="Preguntas hoy" valor={String(metricas.hoy)} />
        <Kpi Icono={Sparkles} etiqueta="Con el modelo" valor={String(metricas.con_ia)} />
        <Kpi Icono={Zap} etiqueta="Modo básico" valor={String(metricas.con_basico)} />
        <Kpi Icono={Users} etiqueta="Clientes (24 h)" valor={String(metricas.clientes)} />
      </div>

      {form && (
        <FormKb
          entrada={form === 'NUEVO' ? null : form}
          pregunta={semilla}
          onListo={() => { setForm(null); setSemilla(''); router.refresh() }}
          onCancelar={() => { setForm(null); setSemilla('') }}
        />
      )}

      {pendientes.length > 0 && (
        <section className="mb-6">
          <h2 className="subtitulo mb-2 flex items-center gap-2">
            <Inbox size={15} className="text-alerta" />
            Sin responder ({pendientes.length})
          </h2>
          <p className="mb-3 text-xs text-tenue">
            Preguntas reales que el asistente no supo contestar. Responde una vez y ya
            las sabrá siempre.
          </p>

          <div className="flex flex-col gap-2">
            {pendientes.map((p) => (
              <article key={p.id} className="tarjeta flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fuerte">“{p.pregunta}”</p>
                  <p className="mt-1 text-xs text-tenue">
                    {p.cliente} · {fecha(p.creado)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 self-end sm:self-center">
                  <button onClick={() => atendida(p)} className="btn btn-suave px-2.5 py-1.5 text-xs">
                    <Check size={13} /> Ya está
                  </button>
                  <button onClick={() => responder(p)} className="btn btn-primario px-2.5 py-1.5 text-xs">
                    <Plus size={13} /> Enseñarle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <h2 className="subtitulo mb-2">Respuestas ({kb.length})</h2>
      <div className="flex flex-col gap-2">
        {kb.map((e) => (
          <article key={e.id} className={`tarjeta p-3 ${e.activo ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fuerte">{e.pregunta}</p>
                <p className="mt-1 text-sm leading-relaxed text-tenue">{e.respuesta}</p>
                {e.acciones.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.acciones.map((id) => (
                      <span key={id} className="chip bg-marca/10 text-[10px] font-medium text-marca">
                        {ACCIONES.find((a) => a.id === id)?.txt ?? id}
                      </span>
                    ))}
                  </div>
                )}

                {e.claves.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.claves.map((c) => (
                      <span key={c} className="chip bg-panel2 text-[10px] text-tenue">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button onClick={() => alternar(e)} className={`btn-icono ${e.activo ? 'activo' : ''}`}
                  title={e.activo ? 'Activa — clic para apagarla' : 'Apagada — clic para activarla'}
                  aria-label={e.activo ? 'Apagar respuesta' : 'Activar respuesta'}>
                  <Check size={15} />
                </button>
                <button onClick={() => { setSemilla(''); setForm(e) }} className="btn-icono"
                  aria-label="Editar" title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setBorrar(e)} className="btn-icono"
                  aria-label="Eliminar" title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {kb.length === 0 && !form && (
        <p className="py-12 text-center text-sm text-tenue">
          Sin respuestas cargadas. El asistente solo podrá derivar a WhatsApp.
        </p>
      )}

      <Dialogo
        abierto={borrar !== null}
        titulo="Eliminar respuesta"
        descripcion={`El asistente dejará de saber responder “${borrar?.pregunta}”.`}
        textoConfirmar="Sí, eliminar"
        peligro
        onConfirmar={() => { if (borrar) void eliminar(borrar) }}
        onCerrar={() => setBorrar(null)}
      />
    </>
  )
}

function Kpi({ Icono, etiqueta, valor }: { Icono: typeof Zap; etiqueta: string; valor: string }) {
  return (
    <div className="tarjeta px-3 py-3 text-center">
      <Icono size={14} className="mx-auto mb-1 text-tenue" />
      <p className="cifra text-lg font-semibold">{valor}</p>
      <p className="text-[11px] leading-tight text-tenue">{etiqueta}</p>
    </div>
  )
}

function FormKb({
  entrada, pregunta, onListo, onCancelar,
}: {
  entrada: Kb | null
  pregunta: string
  onListo: () => void
  onCancelar: () => void
}) {
  const sb = supabaseBrowser()
  const [f, setF] = useState({
    pregunta: entrada?.pregunta ?? pregunta,
    respuesta: entrada?.respuesta ?? '',
    claves: (entrada?.claves ?? []).join(', '),
    orden: String(entrada?.orden ?? 0),
  })
  const [acciones, setAcciones] = useState<string[]>(entrada?.acciones ?? [])
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const p = f.pregunta.trim()
    const r = f.respuesta.trim()
    if (!p) return toast.error('Escribe la pregunta.')
    if (!r) return toast.error('Escribe la respuesta.')

    setGuardando(true)
    const fila = {
      pregunta: p,
      respuesta: r,
      claves: f.claves.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean),
      acciones,
      orden: parseInt(f.orden, 10) || 0,
    }

    const { error } = entrada
      ? await sb.from('assistant_kb').update(fila).eq('id', entrada.id)
      : await sb.from('assistant_kb').insert(fila)
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(entrada ? 'Respuesta actualizada' : 'El asistente ya lo sabe')
    onListo()
  }

  return (
    <div className="tarjeta mb-5 flex flex-col gap-3 p-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-tenue">Pregunta</span>
        <input className="campo" placeholder="¿Cuánto tarda mi recarga?"
          value={f.pregunta} onChange={(e) => setF({ ...f, pregunta: e.target.value })} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-tenue">
          Respuesta (contéstala como se la dirías a un cliente)
        </span>
        <textarea className="campo min-h-24 resize-y" rows={3}
          placeholder="Revisamos los comprobantes a mano, suele tomar unos minutos…"
          value={f.respuesta} onChange={(e) => setF({ ...f, respuesta: e.target.value })} />
      </label>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">
            Palabras clave, separadas por comas
          </span>
          <input className="campo" placeholder="tarda, demora, cuanto tiempo, pendiente"
            value={f.claves} onChange={(e) => setF({ ...f, claves: e.target.value })} />
          <span className="mt-1 block text-[11px] text-tenue">
            Son las que usa el modo básico para reconocer la pregunta. Escribe cómo lo diría
            un cliente, no cómo lo dirías tú.
          </span>
        </label>

        <label className="block sm:w-24">
          <span className="mb-1.5 block text-xs font-medium text-tenue">Orden</span>
          <input className="campo" inputMode="numeric"
            value={f.orden} onChange={(e) => setF({ ...f, orden: e.target.value })} />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-tenue">
          Botones bajo la respuesta (hasta 3)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {ACCIONES.map((a) => {
            const puesto = acciones.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAcciones((v) =>
                  puesto ? v.filter((x) => x !== a.id) : v.length >= 3 ? v : [...v, a.id])}
                disabled={!puesto && acciones.length >= 3}
                className={`chip border transition ${puesto
                  ? 'border-marca bg-marca/10 text-marca'
                  : 'border-linea bg-panel2 text-tenue hover:text-fuerte disabled:opacity-40'}`}
              >
                {a.txt}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[11px] text-tenue">
          Si no eliges ninguno, el asistente los deduce de lo que preguntó el cliente.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button onClick={onCancelar} className="btn btn-suave">Cancelar</button>
        <button onClick={guardar} disabled={guardando} className="btn btn-primario">
          {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {entrada ? 'Guardar cambios' : 'Enseñárselo'}
        </button>
      </div>
    </div>
  )
}
