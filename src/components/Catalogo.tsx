'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion, refrescarCarrito } from '@/lib/sesion'
import { usd, mensajeError } from '@/lib/format'
import ImagenProducto from './ImagenProducto'

export type Producto = {
  id: string
  slug: string
  nombre: string
  diamantes: number
  precio_cents: number
  stock_disponible: number
  imagen_url: string | null
}

export default function Catalogo({ productos }: { productos: Producto[] }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const { uid, cargando } = useSesion()
  const [stock, setStock] = useState<Record<string, number>>(
    () => Object.fromEntries(productos.map((p) => [p.id, p.stock_disponible])),
  )
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [listo, setListo] = useState<string | null>(null)

  // El catálogo llega de una página cacheada, así que el stock puede venir
  // desfasado. Realtime lo corrige al montar y con cada compra ajena.
  useEffect(() => {
    void (async () => {
      const { data } = await sb.from('products').select('id, stock_disponible').eq('activo', true)
      const filas = data as { id: string; stock_disponible: number }[] | null
      if (filas) setStock(Object.fromEntries(filas.map((p) => [p.id, p.stock_disponible])))
    })()

    const canal = sb
      .channel('stock-publico')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (p: { new: { id: string; stock_disponible: number } }) =>
          setStock((prev) => ({ ...prev, [p.new.id]: p.new.stock_disponible })))
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [sb])

  async function agregar(p: Producto) {
    if (!uid) return router.push('/login?volver=/')

    setOcupado(p.id)
    const { data: fila } = await sb.from('cart_items')
      .select('cantidad').eq('user_id', uid).eq('product_id', p.id).maybeSingle()
    const actual = (fila as { cantidad: number } | null)?.cantidad ?? 0

    const { error } = await sb.rpc('fn_cart_set', {
      p_product_id: p.id,
      p_cantidad: Math.min(actual + 1, 50),
    })
    setOcupado(null)

    if (error) return toast.error(mensajeError(error.message))

    refrescarCarrito()
    setListo(p.id)
    setTimeout(() => setListo(null), 1400)
    toast.success(`${p.nombre} en el carrito`, {
      action: { label: 'Ver carrito', onClick: () => router.push('/carrito') },
    })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="titulo">Elige tu recarga</h2>
        <span className="text-xs text-tenue">{productos.length} opciones</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p, i) => {
          const s = stock[p.id] ?? 0
          const agotado = s <= 0
          const enCurso = ocupado === p.id
          const recien = listo === p.id

          return (
            <article key={p.id}
              className={`tarjeta group flex flex-col overflow-hidden transition ${
                agotado ? 'opacity-60' : 'hover:border-marca/40'}`}>
              {/* La imagen es la card: el arte ya trae la cantidad de diamantes,
                  así que abajo solo queda el precio y la acción. */}
              <div className="relative">
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={i < 4}
                  iconoSize={44}
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 32vw, 46vw"
                  zoom={!agotado}
                  className={`aspect-4/5 w-full ${agotado ? 'grayscale' : ''}`}
                />
                <span className={`chip absolute left-2 top-2 backdrop-blur-sm ${
                  agotado ? 'bg-error/25 text-error'
                  : s <= 5 ? 'bg-alerta/25 text-alerta' : 'bg-base/70 text-ok'}`}>
                  {agotado ? 'Agotado' : `${s} disp.`}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-end gap-2.5 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="cifra text-lg font-semibold text-marca sm:text-xl">{usd(p.precio_cents)}</p>
                  <p className="cifra text-[11px] text-tenue">
                    {p.diamantes.toLocaleString('es-EC')} <span className="sr-only">diamantes</span>
                    <span aria-hidden> 💎</span>
                  </p>
                </div>

                <button
                  onClick={() => agregar(p)}
                  disabled={agotado || enCurso || cargando}
                  aria-label={`Agregar ${p.nombre} al carrito`}
                  className={`btn w-full ${agotado || recien ? 'btn-suave' : 'btn-primario'}`}
                >
                  {agotado ? 'Sin stock'
                    : enCurso ? <Loader2 size={15} className="animate-spin" />
                    : recien ? <><Check size={15} className="text-ok" /> Agregado</>
                    : <><Plus size={15} /> Agregar</>}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {productos.length === 0 && (
        <p className="py-16 text-center text-sm text-tenue">Aún no hay productos publicados.</p>
      )}
    </section>
  )
}
