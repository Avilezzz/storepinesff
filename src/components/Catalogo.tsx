'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gem, Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion, refrescarCarrito } from '@/lib/sesion'
import { usd, mensajeError } from '@/lib/format'

export type Producto = {
  id: string
  slug: string
  nombre: string
  diamantes: number
  precio_cents: number
  stock_disponible: number
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {productos.map((p) => {
          const s = stock[p.id] ?? 0
          const agotado = s <= 0
          const enCurso = ocupado === p.id
          const recien = listo === p.id

          return (
            <article key={p.id}
              className={`tarjeta flex flex-col p-4 transition ${agotado ? 'opacity-55' : 'hover:border-marca/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <Gem size={18} className="text-marca" strokeWidth={2} />
                <span className={`chip ${
                  agotado ? 'bg-error/12 text-error'
                  : s <= 5 ? 'bg-alerta/12 text-alerta' : 'bg-ok/12 text-ok'}`}>
                  {agotado ? 'Agotado' : `${s} disp.`}
                </span>
              </div>

              <p className="cifra mt-3 text-xl font-semibold sm:text-2xl">
                {p.diamantes.toLocaleString('es-EC')}
              </p>
              <p className="text-xs text-tenue">diamantes</p>

              <p className="cifra mt-3 text-lg font-semibold text-marca sm:text-xl">{usd(p.precio_cents)}</p>

              <button
                onClick={() => agregar(p)}
                disabled={agotado || enCurso || cargando}
                className={`btn mt-3 w-full ${agotado ? 'btn-suave' : recien ? 'btn-suave' : 'btn-primario'}`}
              >
                {agotado ? 'Sin stock'
                  : enCurso ? <Loader2 size={15} className="animate-spin" />
                  : recien ? <><Check size={15} className="text-ok" /> Agregado</>
                  : <><Plus size={15} /> Agregar</>}
              </button>
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
