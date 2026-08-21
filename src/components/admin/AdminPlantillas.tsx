'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Pencil, Eye, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { mensajeError } from '@/lib/format'
import Dialogo from '../ui/Dialogo'
import { VARIABLES, usePrevia, type Ambito, type Plantilla } from './plantillas'

const AMBITOS: { id: Ambito; txt: string; nota: string }[] = [
  { id: 'ambos',      txt: 'En los dos',   nota: 'Aparece al escribirle a un cliente y en las campañas' },
  { id: 'individual', txt: 'A un cliente', nota: 'Solo al escribirle a alguien en concreto' },
  { id: 'novedades',  txt: 'Campañas',     nota: 'Solo en los envíos a todos' },
]

const NUEVA: Omit<Plantilla, 'id'> = {
  nombre: '', asunto: '', cuerpo: '', ambito: 'ambos', activo: true, orden: 99,
}

export default function AdminPlantillas({ plantillas }: { plantillas: Plantilla[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<Plantilla | Omit<Plantilla, 'id'> | null>(null)
  const [borrar, setBorrar] = useState<Plantilla | null>(null)
  const sb = supabaseBrowser()

  async function eliminar() {
    if (!borrar) return
    const { error } = await sb.from('email_templates').delete().eq('id', borrar.id)
    setBorrar(null)
    if (error) return toast.error(mensajeError(error.message))
    toast.success('Plantilla borrada')
    router.refresh()
  }

  return (
    <>
      <Link href="/admin/novedades" className="enlace"><ArrowLeft size={14} /> Novedades</Link>

      <div className="mb-5 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo">Plantillas</h1>
          <p className="mt-0.5 text-sm text-tenue">
            Textos guardados con variables. Se rellenan solos con los datos de cada cliente.
          </p>
        </div>
        <button onClick={() => setEditando(NUEVA)} className="btn btn-primario">
          <Plus size={15} /> Nueva
        </button>
      </div>

      {plantillas.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <FileText size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Todavía no hay plantillas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plantillas.map((p) => (
            <div key={p.id} className="tarjeta p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{p.nombre}</p>
                    <span className="chip bg-panel2 text-tenue">
                      {AMBITOS.find((a) => a.id === p.ambito)?.txt}
                    </span>
                    {!p.activo && <span className="chip bg-alerta/12 text-alerta">Oculta</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-tenue">{p.asunto}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-tenue/70">
                    {p.cuerpo}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditando(p)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-tenue transition hover:bg-panel2 hover:text-marca">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setBorrar(p)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-tenue transition hover:bg-panel2 hover:text-error">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <ModalPlantilla plantilla={editando} onCerrar={() => setEditando(null)}
          onListo={() => { setEditando(null); router.refresh() }} />
      )}

      <Dialogo
        abierto={Boolean(borrar)}
        titulo="Borrar plantilla"
        descripcion={`Se elimina "${borrar?.nombre}". Los correos ya enviados no cambian.`}
        textoConfirmar="Borrar"
        peligro
        onConfirmar={() => { void eliminar() }}
        onCerrar={() => setBorrar(null)}
      />
    </>
  )
}

function ModalPlantilla({ plantilla, onCerrar, onListo }: {
  plantilla: Plantilla | Omit<Plantilla, 'id'>
  onCerrar: () => void
  onListo: () => void
}) {
  const sb = supabaseBrowser()
  const [f, setF] = useState(plantilla)
  const [guardando, setGuardando] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const esNueva = !('id' in plantilla)
  const previaAsunto = usePrevia(f.asunto)
  const previaCuerpo = usePrevia(f.cuerpo)

  function insertar(v: string) {
    const el = areaRef.current
    if (!el) return setF((x) => ({ ...x, cuerpo: x.cuerpo + v }))
    const { selectionStart: i, selectionEnd: j } = el
    setF((x) => ({ ...x, cuerpo: x.cuerpo.slice(0, i) + v + x.cuerpo.slice(j) }))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(i + v.length, i + v.length)
    })
  }

  async function guardar() {
    if (!f.nombre.trim()) return toast.error('Ponle un nombre a la plantilla.')
    if (!f.asunto.trim()) return toast.error('Escribe el asunto.')
    if (!f.cuerpo.trim()) return toast.error('Escribe el mensaje.')

    setGuardando(true)
    const fila = {
      nombre: f.nombre.trim(), asunto: f.asunto.trim(), cuerpo: f.cuerpo.trim(),
      ambito: f.ambito, activo: f.activo, orden: f.orden,
    }
    const { error } = esNueva
      ? await sb.from('email_templates').insert(fila)
      : await sb.from('email_templates').update(fila).eq('id', (plantilla as Plantilla).id)
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(esNueva ? 'Plantilla creada' : 'Plantilla guardada')
    onListo()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center velo p-0 sm:items-center sm:p-4"
      onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-5">
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          {esNueva ? 'Nueva plantilla' : 'Editar plantilla'}
        </h3>

        <label className="mb-1.5 block text-xs font-medium text-tenue">Nombre (solo lo ves tú)</label>
        <input className="campo" placeholder="Te extrañamos" autoFocus
          value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Dónde aparece</label>
        <div className="flex flex-wrap gap-1.5">
          {AMBITOS.map((a) => (
            <button key={a.id} type="button" onClick={() => setF({ ...f, ambito: a.id })}
              className={`chip border px-2.5 py-1.5 transition ${
                f.ambito === a.id ? 'border-marca bg-marca/10 text-marca' : 'border-linea bg-panel2 text-tenue'}`}>
              {a.txt}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-tenue/70">
          {AMBITOS.find((a) => a.id === f.ambito)?.nota}
        </p>

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Asunto</label>
        <input className="campo" placeholder="{nombre}, hace {dias} días que no te vemos"
          value={f.asunto} onChange={(e) => setF({ ...f, asunto: e.target.value })} />

        <label className="mb-1.5 mt-3.5 block text-xs font-medium text-tenue">Mensaje</label>
        <textarea ref={areaRef} className="campo min-h-36 resize-y" rows={6}
          value={f.cuerpo} onChange={(e) => setF({ ...f, cuerpo: e.target.value })} />

        <div className="mt-2.5 rounded-lg border border-linea bg-panel2 p-3">
          <p className="etiqueta mb-1.5">Toca para insertar</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((x) => (
              <button key={x.v} type="button" onClick={() => insertar(x.v)}
                title={x.d}
                className="cifra rounded border border-linea bg-panel px-1.5 py-1 text-[11px] text-marca transition hover:border-marca/50">
                {x.v}
              </button>
            ))}
          </div>
        </div>

        {(f.asunto || f.cuerpo) && (
          <div className="mt-3.5 rounded-xl border border-linea bg-panel2 p-3.5">
            <p className="etiqueta mb-2 flex items-center gap-1.5"><Eye size={12} /> Vista previa</p>
            <p className="text-sm font-semibold">{previaAsunto || 'Sin asunto'}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-tenue">
              {previaCuerpo}
            </p>
          </div>
        )}

        <label className="mt-3.5 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.activo}
            onChange={(e) => setF({ ...f, activo: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-marca)]" />
          Mostrarla al escribir correos
        </label>

        <div className="mt-5 flex gap-2">
          <button onClick={onCerrar} className="btn btn-suave flex-1">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="btn btn-primario flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
