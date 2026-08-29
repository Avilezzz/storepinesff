'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Pencil, Trash2, Eye, EyeOff, ImagePlus, Loader2, MousePointerClick,
  Megaphone, Play, Link2, Smartphone, Monitor, Pipette, RotateCcw,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { fecha, mensajeError } from '@/lib/format'
import {
  estadoAviso, type Aviso, type Audiencia, type EstadoAviso, type MetricasAvisos,
} from '@/lib/avisos'
import { paletaDeOrigen } from '@/lib/paleta'
import { TarjetaAviso } from '@/components/Avisos'
import Dialogo from '../ui/Dialogo'

const BUCKET = 'avisos'
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
const MAX_BYTES = 3 * 1024 * 1024

const AUDIENCIAS: { valor: Audiencia; txt: string }[] = [
  { valor: 'CLIENTES',   txt: 'Solo con sesión iniciada' },
  { valor: 'VISITANTES', txt: 'Solo visitantes sin cuenta' },
  { valor: 'TODOS',      txt: 'Todo el mundo' },
]

const COLOR: Record<EstadoAviso, string> = {
  VIGENTE:    'bg-ok/15 text-ok ring-1 ring-ok/30',
  PROGRAMADO: 'bg-marca/15 text-marca ring-1 ring-marca/30',
  VENCIDO:    'bg-error/15 text-error ring-1 ring-error/30',
  PAUSADO:    'bg-panel2 text-tenue ring-1 ring-linea',
}

/** Sube el arte al bucket público y devuelve su URL, o null si algo falló. */
async function subirImagen(
  sb: ReturnType<typeof supabaseBrowser>, carpeta: string, file: File,
): Promise<string | null> {
  if (!TIPOS.includes(file.type)) {
    toast.error('Formato no admitido. Usa JPG, PNG, WebP, AVIF o GIF.')
    return null
  }
  if (file.size > MAX_BYTES) {
    toast.error('La imagen pesa más de 3 MB. Comprímela antes de subirla.')
    return null
  }

  // Ruta nueva en cada subida: así ninguna CDN sirve el arte viejo en caché.
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const ruta = `${carpeta}/${Date.now()}.${ext}`

  const { error } = await sb.storage.from(BUCKET)
    .upload(ruta, file, { cacheControl: '31536000' })
  if (error) {
    toast.error(mensajeError(error.message))
    return null
  }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

/** Borra del bucket un arte que ya nadie usa; si no se puede, queda huérfano. */
async function borrarImagen(sb: ReturnType<typeof supabaseBrowser>, url: string | null) {
  const ruta = url?.split(`/${BUCKET}/`)[1]
  if (ruta) await sb.storage.from(BUCKET).remove([decodeURIComponent(ruta)])
}

export default function AdminAvisos({
  avisos, metricas,
}: { avisos: Aviso[]; metricas: MetricasAvisos }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [form, setForm] = useState<Aviso | 'NUEVO' | null>(null)
  const [borrar, setBorrar] = useState<Aviso | null>(null)
  const [previa, setPrevia] = useState<Aviso | null>(null)

  const stats = new Map(metricas.por_aviso.map((m) => [m.id, m]))

  async function alternar(a: Aviso) {
    const { error } = await sb.from('notices').update({ activo: !a.activo }).eq('id', a.id)
    if (error) return toast.error(mensajeError(error.message))
    toast(a.activo ? `"${a.titulo}" pausado` : `"${a.titulo}" al aire`)
    router.refresh()
  }

  async function eliminar(a: Aviso) {
    const { error } = await sb.from('notices').delete().eq('id', a.id)
    if (error) return toast.error(mensajeError(error.message))

    await borrarImagen(sb, a.imagen_url)
    await borrarImagen(sb, a.imagen_movil_url)
    setBorrar(null)
    toast.success(`"${a.titulo}" eliminado`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="titulo">Avisos</h1>
        <button onClick={() => setForm(form ? null : 'NUEVO')} className="btn btn-suave">
          {form ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nuevo aviso</>}
        </button>
      </div>
      <p className="mb-4 text-sm text-tenue">
        Aparecen al entrar a la tienda, uno tras otro, y no se repiten hasta el próximo
        inicio de sesión.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Kpi Icono={Megaphone} etiqueta="Al aire ahora" valor={String(metricas.activos)} />
        <Kpi Icono={Eye} etiqueta="Vistas hoy" valor={String(metricas.vistas_hoy)} />
        <Kpi Icono={MousePointerClick} etiqueta="Clics hoy" valor={String(metricas.clics_hoy)} />
      </div>

      {form && (
        <FormAviso
          aviso={form === 'NUEVO' ? null : form}
          onListo={() => { setForm(null); router.refresh() }}
          onCancelar={() => setForm(null)}
        />
      )}

      <div className="flex flex-col gap-3">
        {avisos.map((a) => {
          const m = stats.get(a.id)
          const vistas = m?.vistas ?? 0
          const clics = m?.clics ?? 0
          const ctr = vistas > 0 ? (clics / vistas) * 100 : 0
          const estado = estadoAviso(a)

          return (
            <article key={a.id} className="tarjeta flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
              <button
                onClick={() => setPrevia(a)}
                title="Ver cómo lo recibe el cliente"
                className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-linea bg-[#080a0e] transition hover:border-marca sm:h-24 sm:w-40"
              >
                <Image src={a.imagen_url} alt="" fill sizes="160px" className="object-contain" />
                <span className="absolute inset-0 grid place-items-center bg-base/60 opacity-0 transition hover:opacity-100">
                  <Play size={18} />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="subtitulo truncate">{a.titulo}</h2>
                  <span className={`chip ${COLOR[estado]}`}>{estado.toLowerCase()}</span>
                  <span className="chip bg-panel2 text-tenue">
                    {AUDIENCIAS.find((x) => x.valor === a.audiencia)?.txt}
                  </span>
                  {a.imagen_movil_url && (
                    <span className="chip bg-panel2 text-tenue" title="Tiene arte propio para teléfono">
                      <Smartphone size={11} /> móvil
                    </span>
                  )}
                  {!a.con_marco && (
                    <span className="chip bg-panel2 text-tenue"
                      title="Sin marco ni efectos: se muestra solo el arte">
                      limpio
                    </span>
                  )}
                </div>

                {a.href && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-tenue">
                    <Link2 size={12} className="shrink-0" />
                    <span className="truncate">{a.href}</span>
                  </p>
                )}

                <p className="mt-1 text-xs text-tenue">
                  {a.inicia_en ? `Desde ${fecha(a.inicia_en)}` : 'Sin fecha de inicio'}
                  {' · '}
                  {a.termina_en ? `hasta ${fecha(a.termina_en)}` : 'sin caducidad'}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1.5 text-tenue">
                    <Eye size={13} /> <b className="cifra text-fuerte">{vistas}</b> vistas
                    {m?.unicos ? <span className="text-tenue">({m.unicos} únicos)</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 text-tenue">
                    <MousePointerClick size={13} /> <b className="cifra text-fuerte">{clics}</b> clics
                  </span>
                  <span className={`cifra font-semibold ${ctr >= 5 ? 'text-ok' : 'text-tenue'}`}>
                    {ctr.toFixed(1)}% CTR
                  </span>
                  {m?.ultimo && <span className="text-tenue">Último: {fecha(m.ultimo)}</span>}
                </div>
              </div>

              <div className="flex shrink-0 gap-1 self-end sm:self-start">
                <button onClick={() => alternar(a)} className={`btn-icono ${a.activo ? 'activo' : ''}`}
                  title={a.activo ? 'Al aire — clic para pausar' : 'Pausado — clic para publicar'}
                  aria-label={a.activo ? 'Pausar aviso' : 'Publicar aviso'}>
                  {a.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => setForm(a)} className="btn-icono" aria-label="Editar" title="Editar">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setBorrar(a)} className="btn-icono" aria-label="Eliminar" title="Eliminar">
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {avisos.length === 0 && !form && (
        <p className="py-16 text-center text-sm text-tenue">
          Todavía no hay avisos. Crea el primero con el botón de arriba.
        </p>
      )}

      {previa && (
        <div onClick={() => setPrevia(null)}
          className="velo fixed inset-0 z-110 flex items-center justify-center overflow-hidden p-4">
          <AnimatePresence>
            <TarjetaAviso a={previa} i={0} total={1}
              onAbrir={() => setPrevia(null)} onCerrar={() => setPrevia(null)} />
          </AnimatePresence>
        </div>
      )}

      <Dialogo
        abierto={borrar !== null}
        titulo="Eliminar aviso"
        descripcion={`"${borrar?.titulo}" dejará de mostrarse y se perderán sus estadísticas. Si solo quieres apagarlo un rato, púsalo en vez de borrarlo.`}
        textoConfirmar="Sí, eliminar"
        peligro
        onConfirmar={() => { if (borrar) void eliminar(borrar) }}
        onCerrar={() => setBorrar(null)}
      />
    </>
  )
}

function Kpi({ Icono, etiqueta, valor }: { Icono: typeof Eye; etiqueta: string; valor: string }) {
  return (
    <div className="tarjeta px-3 py-3 text-center">
      <Icono size={14} className="mx-auto mb-1 text-tenue" />
      <p className="cifra text-lg font-semibold">{valor}</p>
      <p className="text-[11px] leading-tight text-tenue">{etiqueta}</p>
    </div>
  )
}

/** ISO a lo que espera un <input type="datetime-local"> (hora del navegador). */
function aInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const aISO = (v: string) => (v ? new Date(v).toISOString() : null)

function FormAviso({
  aviso, onListo, onCancelar,
}: { aviso: Aviso | null; onListo: () => void; onCancelar: () => void }) {
  const sb = supabaseBrowser()
  const [f, setF] = useState({
    titulo: aviso?.titulo ?? '',
    href: aviso?.href ?? '',
    cta: aviso?.cta ?? '',
    audiencia: aviso?.audiencia ?? ('CLIENTES' as Audiencia),
    activo: aviso?.activo ?? true,
    inicia: aInput(aviso?.inicia_en ?? null),
    termina: aInput(aviso?.termina_en ?? null),
    orden: String(aviso?.orden ?? 0),
    con_marco: aviso?.con_marco ?? true,
    con_titulo: aviso?.con_titulo ?? true,
    con_boton: aviso?.con_boton ?? true,
    color_a: aviso?.color_a ?? '',
    color_b: aviso?.color_b ?? '',
  })
  const [arte, setArte] = useState<File | null>(null)
  const [arteMovil, setArteMovil] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [leyendo, setLeyendo] = useState(false)

  /**
   * Lee los colores del arte. Se dispara al elegir el archivo, antes de
   * subirlo: en local no hay permisos de dominio de por medio y se puede mirar
   * la imagen sin pedirle nada a nadie.
   */
  async function leerColores(origen: File | string) {
    setLeyendo(true)
    const p = await paletaDeOrigen(origen)
    setLeyendo(false)
    if (p) setF((v) => ({ ...v, color_a: p.a, color_b: p.b }))
    return p
  }

  function elegirArte(file: File | null) {
    setArte(file)
    if (file) void leerColores(file)
  }

  // Un aviso de antes de que esto existiera no tiene colores guardados: se
  // intentan sacar de su arte ya subido. Si el servidor no deja leer la imagen
  // no pasa nada, se queda con los colores de la tienda.
  useEffect(() => {
    if (!aviso?.imagen_url || aviso.color_a) return
    void leerColores(aviso.imagen_url)
    // Depende solo del aviso abierto: reintentarlo en cada tecleo del
    // formulario sería descargar y analizar la imagen una y otra vez.
  }, [aviso?.id, aviso?.imagen_url, aviso?.color_a])

  async function guardar() {
    const titulo = f.titulo.trim()
    const href = f.href.trim()

    if (!titulo) return toast.error('Ponle un título al aviso.')
    if (!aviso && !arte) return toast.error('Sube el arte del aviso.')
    if (href && !/^(https?:\/\/|\/)/.test(href)) {
      return toast.error('El enlace debe empezar por https:// o por / si es de la tienda.')
    }
    if (f.inicia && f.termina && new Date(f.termina) <= new Date(f.inicia)) {
      return toast.error('La fecha de fin tiene que ser posterior a la de inicio.')
    }

    setGuardando(true)

    // El id se decide antes de subir nada: es la carpeta donde vive el arte,
    // así el bucket queda ordenado por aviso y se limpia entero al borrarlo.
    const id = aviso?.id ?? crypto.randomUUID()
    const url = arte ? await subirImagen(sb, id, arte) : aviso?.imagen_url ?? null
    if (!url) { setGuardando(false); return }

    const urlMovil = arteMovil
      ? await subirImagen(sb, id, arteMovil)
      : aviso?.imagen_movil_url ?? null

    const fila = {
      id,
      titulo,
      imagen_url: url,
      imagen_movil_url: urlMovil,
      href: href || null,
      externo: /^https?:\/\//i.test(href),
      cta: f.cta.trim() || null,
      audiencia: f.audiencia,
      activo: f.activo,
      inicia_en: aISO(f.inicia),
      termina_en: aISO(f.termina),
      orden: parseInt(f.orden, 10) || 0,
      con_marco: f.con_marco,
      con_titulo: f.con_titulo,
      con_boton: f.con_boton,
      color_a: f.color_a || null,
      color_b: f.color_b || null,
    }

    const { error } = await sb.from('notices').upsert(fila)
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))

    // El arte reemplazado se borra después de que la fila ya apunta al nuevo:
    // si algo falla antes, el aviso nunca se queda sin imagen.
    if (arte && aviso?.imagen_url) await borrarImagen(sb, aviso.imagen_url)
    if (arteMovil && aviso?.imagen_movil_url) await borrarImagen(sb, aviso.imagen_movil_url)

    toast.success(aviso ? 'Aviso actualizado' : 'Aviso creado')
    onListo()
  }

  return (
    <div className="tarjeta mb-4 flex flex-col gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">Título</span>
          <input className="campo" placeholder="Combo de aniversario"
            value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">
            Enlace al tocarlo (opcional)
          </span>
          <input className="campo" placeholder="https://… o /recargar"
            value={f.href} onChange={(e) => setF({ ...f, href: e.target.value })} />
        </label>

        <ElegirArte
          etiqueta="Arte principal" Icono={Monitor} archivo={arte} onElegir={elegirArte}
          actual={aviso?.imagen_url ?? null}
          ayuda="Horizontal (16:10). Es el que se ve en computadora."
        />

        <ElegirArte
          etiqueta="Arte para teléfono (opcional)" Icono={Smartphone}
          archivo={arteMovil} onElegir={setArteMovil}
          actual={aviso?.imagen_movil_url ?? null}
          ayuda="Vertical (4:5). Si no lo subes se usa el principal."
        />

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">Texto del botón</span>
          <input className="campo" placeholder="Ver más" disabled={!f.con_boton}
            value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">¿Quién lo ve?</span>
          <select className="campo" value={f.audiencia}
            onChange={(e) => setF({ ...f, audiencia: e.target.value as Audiencia })}>
            {AUDIENCIAS.map((a) => <option key={a.valor} value={a.valor}>{a.txt}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">Empieza (opcional)</span>
          <input type="datetime-local" className="campo"
            value={f.inicia} onChange={(e) => setF({ ...f, inicia: e.target.value })} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">Termina (opcional)</span>
          <input type="datetime-local" className="campo"
            value={f.termina} onChange={(e) => setF({ ...f, termina: e.target.value })} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-tenue">
            Orden (el más bajo se muestra primero)
          </span>
          <input className="campo" inputMode="numeric"
            value={f.orden} onChange={(e) => setF({ ...f, orden: e.target.value })} />
        </label>

        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-marca)]"
            checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
          Publicado
        </label>

        {/* Un banner ya diseñado trae su propio título y su propio botón
            dibujados dentro. Apagando las tres cosas queda solo el arte, que se
            toca entero si lleva enlace. */}
        <div className="rounded-xl bg-panel2 p-3.5 sm:col-span-2">
          <p className="etiqueta mb-1">Cómo se muestra</p>
          <p className="mb-3 text-[11px] leading-relaxed text-tenue">
            Apágalo todo si tu imagen ya lo trae dibujado: el aviso queda solo con el arte
            y se toca entero para abrir el enlace.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Interruptor
              marcado={f.con_marco} onCambio={(v) => setF({ ...f, con_marco: v })}
              txt="Marco animado" ayuda="Borde, rayos, confeti y destello" />
            <Interruptor
              marcado={f.con_titulo} onCambio={(v) => setF({ ...f, con_titulo: v })}
              txt="Título debajo" ayuda="El título se guarda igual, no se pinta" />
            <Interruptor
              marcado={f.con_boton} onCambio={(v) => setF({ ...f, con_boton: v })}
              txt="Botón de acción" ayuda="Sin él, se toca la propia imagen" />
          </div>

          {/* Los colores salen de la imagen sola, pero el último criterio es el
              tuyo: si el arte engaña al análisis, se corrigen a mano. */}
          <div className="mt-3.5 border-t border-linea pt-3.5">
            <p className="etiqueta mb-1 flex items-center gap-1.5">
              <Pipette size={12} /> Colores del arte
              {leyendo && <Loader2 size={12} className="animate-spin" />}
            </p>
            <p className="mb-3 text-[11px] leading-relaxed text-tenue">
              Se leen solos de la imagen al subirla y visten el borde, los rayos, el confeti
              y el botón. Si no convencen, cámbialos aquí.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Muestra valor={f.color_a} onCambio={(v) => setF({ ...f, color_a: v })} txt="Principal" />
              <Muestra valor={f.color_b} onCambio={(v) => setF({ ...f, color_b: v })} txt="Segundo" />

              {(arte || aviso?.imagen_url) && (
                <button type="button" disabled={leyendo}
                  onClick={() => void leerColores(arte ?? aviso!.imagen_url)}
                  className="btn btn-suave h-9 px-3 text-xs">
                  <RotateCcw size={13} /> Volver a leer
                </button>
              )}

              {(f.color_a || f.color_b) && (
                <button type="button" onClick={() => setF({ ...f, color_a: '', color_b: '' })}
                  className="text-xs text-tenue underline transition hover:text-fuerte">
                  Usar los de la tienda
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button onClick={onCancelar} className="btn btn-suave">Cancelar</button>
        <button onClick={guardar} disabled={guardando} className="btn btn-primario">
          {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {aviso ? 'Guardar cambios' : 'Crear aviso'}
        </button>
      </div>
    </div>
  )
}

/** Una muestra de color. El cuadrado es el propio selector nativo, que ya sabe
 *  abrir la paleta del sistema; vacío significa "usa el color de la tienda". */
function Muestra({
  valor, onCambio, txt,
}: { valor: string; onCambio: (v: string) => void; txt: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-linea bg-panel px-2 py-1.5">
      <input
        type="color"
        value={valor || '#c2410c'}
        onChange={(e) => onCambio(e.target.value)}
        className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={`Color ${txt.toLowerCase()}`}
      />
      <span className="text-[11px] leading-tight">
        <span className="block font-medium">{txt}</span>
        <span className="block font-mono text-tenue">{valor || 'de la tienda'}</span>
      </span>
    </label>
  )
}

function Interruptor({
  marcado, onCambio, txt, ayuda,
}: { marcado: boolean; onCambio: (v: boolean) => void; txt: string; ayuda: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition
      ${marcado ? 'border-marca bg-marca/10' : 'border-linea bg-panel'}`}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-marca)]"
        checked={marcado} onChange={(e) => onCambio(e.target.checked)} />
      <span className="min-w-0">
        <span className="block text-xs font-medium">{txt}</span>
        <span className="mt-0.5 block text-[11px] leading-tight text-tenue">{ayuda}</span>
      </span>
    </label>
  )
}

function ElegirArte({
  etiqueta, Icono, archivo, actual, ayuda, onElegir,
}: {
  etiqueta: string
  Icono: typeof Monitor
  archivo: File | null
  actual: string | null
  ayuda: string
  onElegir: (f: File | null) => void
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-tenue">
        <Icono size={12} /> {etiqueta}
      </span>
      <div className="flex items-center gap-2">
        {actual && !archivo && (
          <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-md border border-linea bg-[#080a0e]">
            <Image src={actual} alt="" fill sizes="64px" className="object-contain" />
          </span>
        )}
        <label className="btn btn-suave min-w-0 flex-1">
          <ImagePlus size={15} className="shrink-0" />
          <span className="truncate">{archivo ? archivo.name : actual ? 'Reemplazar' : 'Elegir archivo'}</span>
          <input type="file" accept={TIPOS.join(',')} className="hidden"
            onChange={(e) => onElegir(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-tenue">{ayuda}</p>
    </div>
  )
}
