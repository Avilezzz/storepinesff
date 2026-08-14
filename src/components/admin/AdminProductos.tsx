'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Plus, Eye, EyeOff, Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { usd, aCentavos, mensajeError } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'

export type Producto = {
  id: string; slug: string; nombre: string; diamantes: number
  precio_cents: number; activo: boolean; orden: number; stock_disponible: number
  imagen_url: string | null
}

const BUCKET = 'productos'
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_BYTES = 2 * 1024 * 1024

/** Sube el archivo al bucket público y devuelve su URL, o null si algo falló. */
async function subirImagen(
  sb: ReturnType<typeof supabaseBrowser>, productId: string, file: File,
): Promise<string | null> {
  if (!TIPOS.includes(file.type)) {
    toast.error('Formato no admitido. Usa JPG, PNG, WebP o AVIF.')
    return null
  }
  if (file.size > MAX_BYTES) {
    toast.error('La imagen pesa más de 2 MB. Comprímela antes de subirla.')
    return null
  }

  // Ruta nueva en cada subida: así ninguna CDN sirve la imagen vieja en caché.
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const ruta = `${productId}/${Date.now()}.${ext}`

  const { error } = await sb.storage.from(BUCKET).upload(ruta, file, { cacheControl: '31536000' })
  if (error) {
    toast.error(mensajeError(error.message))
    return null
  }
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

/** Borra del bucket la imagen anterior; si no se puede, solo queda huérfana. */
async function borrarAnterior(sb: ReturnType<typeof supabaseBrowser>, url: string | null) {
  const ruta = url?.split(`/${BUCKET}/`)[1]
  if (ruta) await sb.storage.from(BUCKET).remove([decodeURIComponent(ruta)])
}

export default function AdminProductos({ productos }: { productos: Producto[] }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [precio, setPrecio] = useState('')
  const [nuevo, setNuevo] = useState(false)

  async function guardarPrecio(p: Producto) {
    const cents = aCentavos(precio)
    if (cents === null || cents <= 0) return toast.error('Precio inválido.')
    if (cents === p.precio_cents) return setEditando(null)

    const { error } = await sb.from('products').update({ precio_cents: cents }).eq('id', p.id)
    if (error) return toast.error(mensajeError(error.message))

    setEditando(null)
    toast.success(`${p.nombre} ahora cuesta ${usd(cents)}`)
    router.refresh()
  }

  async function alternar(p: Producto) {
    const { error } = await sb.from('products').update({ activo: !p.activo }).eq('id', p.id)
    if (error) return toast.error(mensajeError(error.message))
    toast(p.activo ? `${p.nombre} oculto de la tienda` : `${p.nombre} publicado`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="titulo">Productos</h1>
        <button onClick={() => setNuevo((v) => !v)} className="btn btn-suave">
          {nuevo ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Nuevo</>}
        </button>
      </div>

      {nuevo && <FormNuevo onListo={() => { setNuevo(false); router.refresh() }} />}

      <div className="tarjeta overflow-x-auto">
        <table className="w-full min-w-md text-sm">
          <thead>
            <tr className="border-b border-linea">
              <th className="etiqueta p-3 text-left">Imagen</th>
              <th className="etiqueta p-3 text-left">Producto</th>
              <th className="etiqueta p-3 text-right">Precio</th>
              <th className="etiqueta p-3 text-right">Stock</th>
              <th className="etiqueta p-3 text-right">Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {productos.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <CeldaImagen p={p} />
                </td>

                <td className="p-3">
                  <p className="font-medium">{p.nombre}</p>
                  <p className="cifra text-xs text-tenue">{p.diamantes.toLocaleString('es-EC')} diamantes</p>
                </td>

                <td className="p-3 text-right">
                  {editando === p.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input autoFocus className="campo w-20 py-1 text-right text-sm" value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') guardarPrecio(p)
                          if (e.key === 'Escape') setEditando(null)
                        }} />
                      <button onClick={() => guardarPrecio(p)} className="btn-icono" aria-label="Guardar">
                        <Check size={15} className="text-ok" />
                      </button>
                      <button onClick={() => setEditando(null)} className="btn-icono" aria-label="Cancelar">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditando(p.id); setPrecio((p.precio_cents / 100).toFixed(2)) }}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-panel2">
                      <span className="cifra font-semibold">{usd(p.precio_cents)}</span>
                      <Pencil size={12} className="text-tenue" />
                    </button>
                  )}
                </td>

                <td className={`cifra p-3 text-right font-semibold ${
                  p.stock_disponible === 0 ? 'text-error' : p.stock_disponible <= 5 ? 'text-alerta' : ''}`}>
                  {p.stock_disponible}
                </td>

                <td className="p-3 text-right">
                  <button onClick={() => alternar(p)} className={`btn-icono ${p.activo ? 'activo' : ''}`}
                    aria-label={p.activo ? 'Ocultar de la tienda' : 'Publicar en la tienda'}
                    title={p.activo ? 'Publicado — clic para ocultar' : 'Oculto — clic para publicar'}>
                    {p.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/** Miniatura de la card: se toca para reemplazarla por otra imagen. */
function CeldaImagen({ p }: { p: Producto }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const entrada = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)

  async function elegir(file: File | undefined) {
    if (!file) return
    setOcupado(true)

    const url = await subirImagen(sb, p.id, file)
    if (url) {
      const { error } = await sb.from('products').update({ imagen_url: url }).eq('id', p.id)
      if (error) toast.error(mensajeError(error.message))
      else {
        await borrarAnterior(sb, p.imagen_url)
        toast.success(`Imagen de ${p.nombre} actualizada`)
        router.refresh()
      }
    }

    setOcupado(false)
    if (entrada.current) entrada.current.value = ''   // permite reelegir el mismo archivo
  }

  async function quitar() {
    setOcupado(true)
    const { error } = await sb.from('products').update({ imagen_url: null }).eq('id', p.id)
    if (error) toast.error(mensajeError(error.message))
    else {
      await borrarAnterior(sb, p.imagen_url)
      toast(`${p.nombre} vuelve al icono por defecto`)
      router.refresh()
    }
    setOcupado(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <input ref={entrada} type="file" accept={TIPOS.join(',')} className="hidden"
        onChange={(e) => elegir(e.target.files?.[0])} />

      <button onClick={() => entrada.current?.click()} disabled={ocupado}
        className="group relative block h-16 w-13 shrink-0 overflow-hidden rounded-lg border border-linea transition hover:border-marca disabled:opacity-50"
        title={p.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}>
        <ImagenProducto url={p.imagen_url} alt={p.nombre} sizes="64px" iconoSize={18}
          className="h-full w-full" />
        <span className={`absolute inset-0 grid place-items-center bg-base/70 transition ${
          ocupado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        </span>
      </button>

      {p.imagen_url && (
        <button onClick={quitar} disabled={ocupado} className="btn-icono" aria-label="Quitar imagen"
          title="Quitar imagen">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function FormNuevo({ onListo }: { onListo: () => void }) {
  const sb = supabaseBrowser()
  const [f, setF] = useState({ diamantes: '', precio: '' })
  const [archivo, setArchivo] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function crear() {
    const d = parseInt(f.diamantes, 10)
    const cents = aCentavos(f.precio)
    if (!d || d <= 0)                 return toast.error('Cantidad de diamantes inválida.')
    if (cents === null || cents <= 0) return toast.error('Precio inválido.')

    setGuardando(true)
    const { data, error } = await sb.from('products').insert({
      slug: `${d}-diamantes`,
      nombre: `${d} Diamantes`,
      diamantes: d,
      precio_cents: cents,
      descripcion: `Pin de ${d} diamantes para Free Fire`,
      orden: d,
    }).select('id').single()

    // La imagen es opcional: si falla la subida el producto ya quedó creado y
    // se le puede poner la card después desde la tabla.
    if (!error && archivo) {
      const id = (data as { id: string }).id
      const url = await subirImagen(sb, id, archivo)
      if (url) await sb.from('products').update({ imagen_url: url }).eq('id', id)
    }
    setGuardando(false)

    if (error) return toast.error(mensajeError(error.message))
    toast.success(`${d} Diamantes creado`)
    onListo()
  }

  return (
    <div className="tarjeta mb-3 flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Diamantes</label>
        <input className="campo w-28" inputMode="numeric" placeholder="110"
          value={f.diamantes} onChange={(e) => setF({ ...f, diamantes: e.target.value })} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Precio (USD)</label>
        <input className="campo w-28" inputMode="decimal" placeholder="1.50"
          value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-tenue">Imagen (opcional)</label>
        <label className="btn btn-suave">
          <ImagePlus size={15} />
          <span className="max-w-40 truncate">{archivo ? archivo.name : 'Elegir archivo'}</span>
          <input type="file" accept={TIPOS.join(',')} className="hidden"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <button onClick={crear} disabled={guardando} className="btn btn-primario">
        {guardando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Crear
      </button>
    </div>
  )
}
