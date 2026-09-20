'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, Loader2, BellRing, BellPlus, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion, refrescarCarrito } from '@/lib/sesion'
import { usd, mensajeError } from '@/lib/format'
import ImagenProducto from './ImagenProducto'
import ModalProducto from './ModalProducto'

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
  const [pedidos, setPedidos] = useState<Set<string>>(new Set())
  const [detalle, setDetalle] = useState<Producto | null>(null)

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

  // Qué productos agotados ya pidió este usuario, para no ofrecerle pedirlos
  // otra vez ni dejar el botón mintiendo tras recargar la página.
  useEffect(() => {
    if (!uid) return setPedidos(new Set())
    void (async () => {
      const { data } = await sb.from('product_requests').select('product_id').eq('user_id', uid)
      const filas = data as { product_id: string }[] | null
      if (filas) setPedidos(new Set(filas.map((f) => f.product_id)))
    })()
  }, [sb, uid])

  async function solicitar(p: Producto) {
    if (!uid) return router.push('/login?volver=/')

    setOcupado(p.id)
    const { error } = await sb.rpc('fn_solicitar_producto', { p_product_id: p.id })
    setOcupado(null)

    if (error) return toast.error(mensajeError(error.message))

    setPedidos((prev) => new Set(prev).add(p.id))
    toast.success('¡Listo! Te avisamos apenas vuelva', {
      description: `${p.nombre} quedó en tu lista de espera.`,
    })
  }

  async function agregar(p: Producto, cantidad = 1) {
    if (!uid) return router.push('/login?volver=/')

    setOcupado(p.id)
    const { data: fila, error: errorCarrito } = await sb.from('cart_items')
      .select('cantidad').eq('user_id', uid).eq('product_id', p.id).maybeSingle()
    if (errorCarrito) {
      setOcupado(null)
      return toast.error(mensajeError(errorCarrito.message))
    }
    const actual = (fila as { cantidad: number } | null)?.cantidad ?? 0

    const { error } = await sb.rpc('fn_cart_set', {
      p_product_id: p.id,
      p_cantidad: Math.min(actual + cantidad, 50),
    })
    setOcupado(null)

    if (error) return toast.error(mensajeError(error.message))

    setDetalle(null)
    refrescarCarrito()
    setListo(p.id)
    setTimeout(() => setListo(null), 1400)
    toast.success(`${cantidad > 1 ? `${cantidad} × ` : ''}${p.nombre} en el carrito`, {
      action: { label: 'Ver carrito', onClick: () => router.push('/carrito') },
    })
  }

  return (
    <section id="catalogo" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="titulo">Elige tu recarga</h2>
        <span className="text-xs text-tenue">{productos.length} opciones</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {productos.map((p, i) => {
          const s = stock[p.id] ?? 0
          const agotado = s <= 0
          const enCurso = ocupado === p.id
          const recien = listo === p.id
          const pedido = pedidos.has(p.id)

          return (
            <article key={p.id}
              className={`tarjeta group flex min-h-36 overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-2.5 ${
                agotado ? 'border-error/35' : 'hover:border-marca/45'}`}>
              {/* La imagen es la card: el arte ya trae la cantidad de diamantes,
                  así que abajo solo queda el precio y la acción. */}
              {/* Toda el arte abre el detalle: es el área grande y obvia de
                  tocar, y deja el botón de abajo libre para la compra rápida. */}
              <button
                type="button"
                onClick={() => setDetalle(p)}
                aria-label={`Ver detalle de ${p.nombre}`}
                className="relative block w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-linea bg-panel2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:w-32"
              >
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={i < 4}
                  iconoSize={44}
                  sizes="128px"
                  zoom={!agotado}
                  className="h-full min-h-32 w-full rounded-xl"
                />

                {/* Agotado conserva el color del arte: se marca con un velo
                    oscuro y una cinta, no apagando el producto. */}
                {agotado && (
                  <span aria-hidden className="absolute inset-0 bg-[#080a0e]/45" />
                )}

                {agotado ? (
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-error/90 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-white shadow-lg">
                    Agotado
                  </span>
                ) : (
                  <span className={`chip absolute left-2 top-2 border backdrop-blur-md font-semibold ${
                    s <= 5 ? 'border-alerta/40 bg-base/85 text-alerta' : 'border-linea/70 bg-base/85 text-ok'}`}>
                    {s <= 5 ? `Últimos ${s}` : 'Disponible'}
                  </span>
                )}

                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-base/80 py-1 text-[10px] font-medium text-fuerte backdrop-blur-sm sm:text-[11px]">
                  <Eye size={11} /> Ver
                </span>
              </button>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 px-3 py-2 sm:px-4">
                <div>
                  <p className="text-xs font-medium text-tenue">Pin digital</p>
                  <p className="cifra mt-1 text-2xl font-bold text-marca">{usd(p.precio_cents)}</p>
                </div>

                {agotado ? (
                  <button
                    onClick={() => solicitar(p)}
                    disabled={enCurso || cargando || pedido}
                    aria-label={pedido
                      ? `Ya pediste que avisemos cuando vuelva ${p.nombre}`
                      : `Avisarme cuando vuelva ${p.nombre}`}
                    className={`btn w-full py-2 text-xs sm:text-sm ${pedido ? 'btn-suave' : 'btn-primario'}`}
                  >
                    {enCurso ? <Loader2 size={15} className="animate-spin" />
                      : pedido ? <><BellRing size={15} className="text-ok" /> Te avisaremos</>
                      : <><BellPlus size={15} /> Avísame</>}
                  </button>
                ) : (
                  <button
                    onClick={() => agregar(p)}
                    disabled={enCurso || cargando}
                    aria-label={`Agregar ${p.nombre} al carrito`}
                    className={`btn w-full py-2 text-xs sm:text-sm ${recien ? 'btn-suave' : 'btn-primario'}`}
                  >
                    {enCurso ? <Loader2 size={15} className="animate-spin" />
                      : recien ? <><Check size={15} className="text-ok" /> Agregado</>
                      : <><Plus size={15} /> Agregar</>}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {productos.length === 0 && (
        <p className="py-16 text-center text-sm text-tenue">Aún no hay productos publicados.</p>
      )}

      <ModalProducto
        producto={detalle}
        stock={detalle ? stock[detalle.id] ?? 0 : 0}
        ocupado={ocupado === detalle?.id}
        pedido={detalle ? pedidos.has(detalle.id) : false}
        onAgregar={agregar}
        onSolicitar={solicitar}
        onCerrar={() => setDetalle(null)}
      />
    </section>
  )
}
