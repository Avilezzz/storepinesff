'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, BellRing, BellPlus, Eye, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { useSesion } from '@/lib/sesion'
import { usd, mensajeError } from '@/lib/format'
import ImagenProducto from './ImagenProducto'
import ModalProducto from './ModalProducto'
import ModalRecarga from './ModalRecarga'

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
  const { uid, saldo, cargando } = useSesion()
  const [stock, setStock] = useState<Record<string, number>>(
    () => Object.fromEntries(productos.map((p) => [p.id, p.stock_disponible])),
  )
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [pedidos, setPedidos] = useState<Set<string>>(new Set())
  const [detalle, setDetalle] = useState<Producto | null>(null)
  const [recargando, setRecargando] = useState<Producto | null>(null)

  // Stock en tiempo real
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

  // Qué productos agotados ya pidió este usuario
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

  /** Abre el modal de recarga directa para este producto. */
  function comprar(p: Producto) {
    if (!uid) return router.push('/login?volver=/')
    setDetalle(null) // cerrar detalle si estaba abierto
    setRecargando(p)
  }

  function onCompraExitosa(orderId: number) {
    // Refrescar stock y redirigir a la orden
    router.refresh()
    setTimeout(() => {
      router.push(`/mis-compras/${orderId}`)
    }, 1500)
  }

  return (
    <section id="catalogo" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="titulo">Elige tu recarga</h2>
        <span className="text-xs text-tenue">{productos.length} opciones</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p, i) => {
          const s = stock[p.id] ?? 0
          const agotado = s <= 0
          const enCurso = ocupado === p.id
          const pedido = pedidos.has(p.id)

          return (
            <article key={p.id}
              className={`tarjeta group flex flex-col overflow-hidden transition ${
                agotado ? 'border-error/40' : 'border-ok/40 hover:border-ok/60'}`}>
              <button
                type="button"
                onClick={() => setDetalle(p)}
                aria-label={`Ver detalle de ${p.nombre}`}
                className="relative block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-marca"
              >
                <ImagenProducto
                  url={p.imagen_url}
                  alt={p.nombre}
                  priority={i < 4}
                  iconoSize={44}
                  sizes="(min-width: 1024px) 260px, (min-width: 640px) 32vw, 46vw"
                  zoom={!agotado}
                  className="aspect-4/5 w-full"
                />

                {agotado && (
                  <span aria-hidden className="absolute inset-0 bg-[#080a0e]/45" />
                )}

                {agotado ? (
                  <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-error/90 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-white shadow-lg">
                    Agotado
                  </span>
                ) : (
                  <span className={`chip absolute left-2 top-2 backdrop-blur-sm font-bold ${
                    s <= 5 ? 'bg-ok/30 text-ok ring-1 ring-ok/40' : 'bg-base/70 text-ok'}`}>
                    {`${s} disp.`}
                  </span>
                )}

                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-base/75 py-1 text-[11px] font-medium text-fuerte opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                  <Eye size={12} /> Ver detalle
                </span>
              </button>

              <div className="flex flex-1 flex-col justify-end gap-2.5 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="cifra text-lg font-semibold text-marca sm:text-xl">{usd(p.precio_cents)}</p>
                  <p className="cifra text-[11px] text-tenue">
                    {p.diamantes.toLocaleString('es-EC')} <span className="sr-only">diamantes</span>
                    <span aria-hidden> 💎</span>
                  </p>
                </div>

                {agotado ? (
                  <button
                    onClick={() => solicitar(p)}
                    disabled={enCurso || cargando || pedido}
                    aria-label={pedido
                      ? `Ya pediste que avisemos cuando vuelva ${p.nombre}`
                      : `Avisarme cuando vuelva ${p.nombre}`}
                    className={`btn w-full ${pedido ? 'btn-suave' : 'btn-primario'}`}
                  >
                    {enCurso ? <Loader2 size={15} className="animate-spin" />
                      : pedido ? <><BellRing size={15} className="text-ok" /> Te avisaremos</>
                      : <><BellPlus size={15} /> Avísame</>}
                  </button>
                ) : (
                  <button
                    onClick={() => comprar(p)}
                    disabled={enCurso || cargando}
                    aria-label={`Comprar ${p.nombre}`}
                    className="btn btn-primario w-full"
                  >
                    {enCurso ? <Loader2 size={15} className="animate-spin" />
                      : <><Zap size={15} /> Comprar</>}
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
        onComprar={comprar}
        onSolicitar={solicitar}
        onCerrar={() => setDetalle(null)}
      />

      <ModalRecarga
        producto={recargando}
        saldo={saldo}
        onCerrar={() => setRecargando(null)}
        onCompraExitosa={onCompraExitosa}
      />
    </section>
  )
}
