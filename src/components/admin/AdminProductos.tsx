'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Check, ImagePlus, Loader2, PackagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, aCentavos, mensajeError } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'
import { actualizarProducto as guardarProducto } from '@/app/admin/productos/actions'

async function actualizarProducto(...args: Parameters<typeof guardarProducto>) {
  try { return await guardarProducto(...args) }
  catch { return { error: { message: 'No se pudo confirmar el guardado. Recarga la página y vuelve a intentarlo.' } } }
}

export type Producto = {
  id: string; slug: string; nombre: string; diamantes: number
  precio_cents: number; activo: boolean; orden: number; stock_disponible: number
  imagen_url: string | null
}

const BUCKET = 'productos'
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_BYTES = 2 * 1024 * 1024

function validarArchivo(file: File) {
  if (!TIPOS.includes(file.type)) return 'Formato no admitido. Usa JPG, PNG, WebP o AVIF.'
  if (file.size > MAX_BYTES) return 'La imagen pesa más de 2 MB. Comprímela antes de subirla.'
  return null
}

async function subirImagen(sb: ReturnType<typeof supabaseBrowser>, id: string, file: File) {
  const validacion = validarArchivo(file)
  if (validacion) { toast.error(validacion); return null }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const ruta = `${id}/${Date.now()}.${ext}`
  const { error } = await sb.storage.from(BUCKET).upload(ruta, file, { cacheControl: '31536000' })
  if (error) { toast.error(mensajeError(error.message)); return null }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

async function borrarAnterior(sb: ReturnType<typeof supabaseBrowser>, url: string | null) {
  const ruta = url?.split(`/${BUCKET}/`)[1]
  if (ruta) await sb.storage.from(BUCKET).remove([decodeURIComponent(ruta)])
}

export default function AdminProductos({ productos }: { productos: Producto[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<Producto | null>(null)
  const [creando, setCreando] = useState(false)
  const visibles = productos.filter((p) => p.activo).length
  const agotados = productos.filter((p) => p.stock_disponible === 0).length

  return <>
    <header className="mb-5 flex items-start justify-between gap-3">
      <div><h1 className="titulo">Productos</h1>
        <p className="mt-1 text-sm text-tenue">Toca una tarjeta para cambiar precio, imagen o visibilidad.</p></div>
      <button onClick={() => setCreando(true)} className="btn btn-primario shrink-0">
        <Plus size={16} /><span className="hidden sm:inline">Nuevo producto</span><span className="sm:hidden">Nuevo</span>
      </button>
    </header>

    <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
      <Resumen valor={productos.length} etiqueta="Productos" />
      <Resumen valor={visibles} etiqueta="Visibles" />
      <Resumen valor={agotados} etiqueta="Agotados" alerta={agotados > 0} />
    </div>

    {productos.length === 0 ? <div className="tarjeta flex flex-col items-center px-6 py-14 text-center">
      <Box size={28} className="mb-3 text-tenue" /><p className="font-medium">Aún no hay productos</p>
      <p className="mt-1 text-sm text-tenue">Crea el primero para empezar a vender.</p>
    </div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {productos.map((p) => <button key={p.id} onClick={() => setEditando(p)}
        className="tarjeta group overflow-hidden text-left transition hover:border-marca/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca">
        <div className="flex gap-3 p-3.5">
          <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-linea bg-panel2">
            <ImagenProducto url={p.imagen_url} alt={p.nombre} sizes="80px" iconoSize={24} className="h-full w-full" />
            {!p.activo && <span className="absolute inset-x-1 bottom-1 rounded bg-base/90 px-1 py-0.5 text-center text-[10px] font-semibold text-tenue">OCULTO</span>}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0">
              <p className="truncate font-semibold">{p.nombre}</p>
              <p className="mt-0.5 text-xs text-tenue">{p.diamantes.toLocaleString('es-EC')} diamantes</p>
            </div><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel2 text-tenue transition group-hover:text-marca"><Pencil size={14} /></span></div>
            <p className="cifra mt-3 text-xl font-semibold text-marca">{usd(p.precio_cents)}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className={p.activo ? 'text-ok' : 'text-tenue'}>{p.activo ? 'Publicado' : 'Oculto'}</span>
              <span className={`cifra font-medium ${p.stock_disponible === 0 ? 'text-error' : p.stock_disponible <= 5 ? 'text-alerta' : 'text-tenue'}`}>{p.stock_disponible} en stock</span>
            </div>
          </div>
        </div>
      </button>)}
    </div>}

    {editando && <ModalEditar producto={editando} onCerrar={() => setEditando(null)} onListo={() => { setEditando(null); router.refresh() }} />}
    {creando && <ModalNuevo onCerrar={() => setCreando(false)} onListo={() => { setCreando(false); router.refresh() }} />}
  </>
}

function Resumen({ valor, etiqueta, alerta = false }: { valor: number; etiqueta: string; alerta?: boolean }) {
  return <div className="tarjeta px-3 py-3 sm:px-4"><p className={`cifra text-xl font-semibold ${alerta ? 'text-alerta' : ''}`}>{valor}</p><p className="mt-0.5 truncate text-xs text-tenue">{etiqueta}</p></div>
}

function ModalBase({ titulo, subtitulo, onCerrar, children }: { titulo: string; subtitulo: string; onCerrar: () => void; children: React.ReactNode }) {
  const cerrar = useRef(onCerrar); cerrar.current = onCerrar
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar.current() }
    document.addEventListener('keydown', esc); document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [])
  return <div role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}
    className="velo fixed inset-0 z-100 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4">
    <div onClick={(e) => e.stopPropagation()} className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-linea bg-panel shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-linea bg-panel px-4 py-4 sm:px-5">
        <div><h2 className="subtitulo">{titulo}</h2><p className="mt-0.5 text-xs text-tenue">{subtitulo}</p></div>
        <button onClick={onCerrar} className="btn-icono -mr-1 -mt-1" aria-label="Cerrar"><X size={18} /></button>
      </div>{children}
    </div>
  </div>
}

function SelectorImagen({ actual, archivo, onArchivo, quitar, onQuitar }: {
  actual: string | null; archivo: File | null; onArchivo: (file: File | null) => void; quitar: boolean; onQuitar: () => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!archivo) { setPreview(null); return }
    const url = URL.createObjectURL(archivo); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])
  const mostrada = quitar ? null : preview ?? actual
  function elegir(file?: File) {
    if (!file) return
    const error = validarArchivo(file); if (error) return toast.error(error)
    onArchivo(file)
  }
  return <div><label className="mb-1.5 block text-xs font-medium text-tenue">Imagen del producto</label>
    <div className="flex items-center gap-3 rounded-xl border border-linea bg-panel2 p-3">
      <ImagenProducto url={mostrada} alt="Vista previa" sizes="72px" iconoSize={24} className="h-20 w-18 shrink-0 rounded-lg border border-linea" />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{archivo?.name ?? (mostrada ? 'Imagen actual' : 'Sin imagen')}</p>
        <p className="mt-0.5 text-xs text-tenue">JPG, PNG, WebP o AVIF · máximo 2 MB</p>
        <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => entrada.current?.click()} className="btn btn-suave px-3 py-1.5 text-xs"><ImagePlus size={14} />{mostrada ? 'Cambiar' : 'Elegir'}</button>
          {(actual || archivo) && !quitar && <button type="button" onClick={onQuitar} className="btn px-2 py-1.5 text-xs text-error"><Trash2 size={14} />Quitar</button>}</div>
      </div><input ref={entrada} type="file" accept={TIPOS.join(',')} className="hidden" onChange={(e) => { elegir(e.target.files?.[0]); e.currentTarget.value = '' }} />
    </div>
  </div>
}

function ModalEditar({ producto: p, onCerrar, onListo }: { producto: Producto; onCerrar: () => void; onListo: () => void }) {
  const sb = supabaseBrowser()
  const [nombre, setNombre] = useState(p.nombre)
  const [precio, setPrecio] = useState((p.precio_cents / 100).toFixed(2))
  const [activo, setActivo] = useState(p.activo)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [quitarImagen, setQuitarImagen] = useState(false)
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    const titulo = nombre.trim(); if (!titulo || titulo.length > 80) return toast.error('El título debe tener entre 1 y 80 caracteres.')
    const cents = aCentavos(precio); if (cents === null || cents <= 0) return toast.error('Precio inválido.')
    setGuardando(true)
    let nuevaUrl: string | null | undefined
    if (archivo) nuevaUrl = await subirImagen(sb, p.id, archivo); else if (quitarImagen) nuevaUrl = null
    if (archivo && !nuevaUrl) { setGuardando(false); return }
    const cambios: { nombre?: string; precio_cents?: number; activo?: boolean; imagen_url?: string | null } = {}
    if (titulo !== p.nombre) cambios.nombre = titulo
    if (cents !== p.precio_cents) cambios.precio_cents = cents
    if (activo !== p.activo) cambios.activo = activo
    if (nuevaUrl !== undefined) cambios.imagen_url = nuevaUrl
    if (!Object.keys(cambios).length) { setGuardando(false); return onCerrar() }
    const { error } = await actualizarProducto(p.id, cambios); setGuardando(false)
    if (error) return toast.error(mensajeError(error.message))
    if (nuevaUrl !== undefined && p.imagen_url) await borrarAnterior(sb, p.imagen_url)
    toast.success(`${p.nombre} actualizado`); onListo()
  }
  return <ModalBase titulo="Editar producto" subtitulo={p.nombre} onCerrar={guardando ? () => {} : onCerrar}>
    <div className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
      <SelectorImagen actual={p.imagen_url} archivo={archivo} onArchivo={(f) => { setArchivo(f); setQuitarImagen(false) }} quitar={quitarImagen} onQuitar={() => { setArchivo(null); setQuitarImagen(true) }} />
      <label className="block"><span className="mb-1.5 block text-xs font-medium text-tenue">Título del producto</span>
        <input autoFocus className="campo" maxLength={80} placeholder="Ej. 110 Diamantes" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <label className="block"><span className="mb-1.5 block text-xs font-medium text-tenue">Precio (USD)</span>
        <input className="campo cifra" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardar()} /></label>
      <button type="button" aria-pressed={activo} onClick={() => setActivo((v) => !v)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-linea bg-panel2 p-3.5 text-left">
        <span><span className="block text-sm font-medium">Visible en la tienda</span><span className="mt-0.5 block text-xs text-tenue">{activo ? 'Los clientes pueden comprarlo.' : 'No aparecerá en el catálogo.'}</span></span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${activo ? 'bg-marca' : 'bg-linea'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${activo ? 'left-6' : 'left-1'}`} /></span>
      </button>
      <div className="flex items-center justify-between rounded-xl border border-linea px-3.5 py-3 text-sm"><span className="text-tenue">Stock disponible</span><span className="cifra font-semibold">{p.stock_disponible}</span></div>
      <p className="-mt-3 text-xs text-tenue">El stock se administra cargando códigos desde la sección Códigos.</p>
      <div className="flex gap-2 pt-1"><button onClick={onCerrar} disabled={guardando} className="btn btn-suave flex-1">Cancelar</button><button onClick={guardar} disabled={guardando} className="btn btn-primario flex-1">{guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </div>
  </ModalBase>
}

function ModalNuevo({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const sb = supabaseBrowser()
  const [nombre, setNombre] = useState(''); const [diamantes, setDiamantes] = useState(''); const [precio, setPrecio] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null); const [guardando, setGuardando] = useState(false)
  async function crear() {
    const d = parseInt(diamantes, 10); const cents = aCentavos(precio)
    if (!d || d <= 0) return toast.error('Cantidad de diamantes inválida.')
    if (cents === null || cents <= 0) return toast.error('Precio inválido.')
    const titulo = nombre.trim() || `${d} Diamantes`
    if (titulo.length > 80) return toast.error('El título no puede superar 80 caracteres.')
    setGuardando(true)
    const { data, error } = await sb.from('products').insert({ slug: `${d}-diamantes`, nombre: titulo, diamantes: d, precio_cents: cents, descripcion: `Pin de ${d} diamantes para Free Fire`, orden: d }).select('id').single()
    if (error) { setGuardando(false); return toast.error(mensajeError(error.message)) }
    if (archivo) { const id = (data as { id: string }).id; const url = await subirImagen(sb, id, archivo); if (url) { const { error: e } = await actualizarProducto(id, { imagen_url: url }); if (e) toast.error(`Producto creado, pero la imagen no se guardó: ${mensajeError(e.message)}`) } }
    setGuardando(false); toast.success(`${d} Diamantes creado`); onListo()
  }
  return <ModalBase titulo="Nuevo producto" subtitulo="Añade una nueva opción al catálogo" onCerrar={guardando ? () => {} : onCerrar}>
    <div className="space-y-5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
      <SelectorImagen actual={null} archivo={archivo} onArchivo={setArchivo} quitar={false} onQuitar={() => setArchivo(null)} />
      <label><span className="mb-1.5 block text-xs font-medium text-tenue">Título del producto</span><input autoFocus className="campo" maxLength={80} placeholder="Se completa como 110 Diamantes" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-medium text-tenue">Cantidad de diamantes</span><input className="campo cifra" inputMode="numeric" placeholder="110" value={diamantes} onChange={(e) => setDiamantes(e.target.value.replace(/\D/g, ''))} /></label>
        <label><span className="mb-1.5 block text-xs font-medium text-tenue">Precio (USD)</span><input className="campo cifra" inputMode="decimal" placeholder="1.50" value={precio} onChange={(e) => setPrecio(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crear()} /></label></div>
      <div className="rounded-xl border border-linea bg-panel2 p-3.5 text-sm text-tenue"><PackagePlus size={17} className="mb-2 text-marca" />El producto se crea sin stock. Después carga sus pines desde la sección Códigos.</div>
      <div className="flex gap-2 pt-1"><button onClick={onCerrar} disabled={guardando} className="btn btn-suave flex-1">Cancelar</button><button onClick={crear} disabled={guardando} className="btn btn-primario flex-1">{guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}{guardando ? 'Creando…' : 'Crear producto'}</button></div>
    </div>
  </ModalBase>
}
