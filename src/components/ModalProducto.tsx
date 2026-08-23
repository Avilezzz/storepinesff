'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, Minus, Check, Loader2, BellRing, BellPlus, ShieldCheck, Zap } from 'lucide-react'
import { usd } from '@/lib/format'
import ImagenProducto from './ImagenProducto'
import type { Producto } from './Catalogo'

/** Tope del carrito: el mismo que aplica `fn_cart_set` en la base. */
const MAX = 50

type Props = {
  producto: Producto | null
  /** Stock vivo del catálogo, que llega por realtime y manda sobre el del SSR. */
  stock: number
  ocupado: boolean
  pedido: boolean
  onAgregar: (p: Producto, cantidad: number) => unknown
  onSolicitar: (p: Producto) => unknown
  onCerrar: () => void
}

/**
 * Detalle de un pin sin sacar al usuario del catálogo: la card es un resumen
 * (arte, precio y un botón), así que todo lo demás —cuántos diamantes, cuánto
 * queda, cuántos llevar— vive aquí.
 *
 * En móvil sube desde abajo y en escritorio se centra, igual que `Dialogo`.
 */
export default function ModalProducto({
  producto, stock, ocupado, pedido, onAgregar, onSolicitar, onCerrar,
}: Props) {
  const [cantidad, setCantidad] = useState(1)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  // `onCerrar` suele llegar como arrow nueva en cada render del catálogo. Si
  // entrara como dependencia del efecto, este se repetiría en cada render y
  // reiniciaría la cantidad elegida.
  const alCerrar = useRef(onCerrar)
  alCerrar.current = onCerrar

  const abierto = producto !== null
  const agotado = stock <= 0
  const tope = Math.min(stock, MAX)

  useEffect(() => {
    if (!abierto) return
    setCantidad(1)
    const t = setTimeout(() => cerrarRef.current?.focus(), 60)

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') alCerrar.current() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierto, producto?.id])

  // El stock puede caer por realtime mientras el modal está abierto: si el
  // usuario ya había elegido más de lo que queda, se le baja la cantidad.
  useEffect(() => {
    if (tope > 0) setCantidad((c) => Math.min(c, tope))
  }, [tope])

  if (!producto) return null

  const p = producto
  const total = p.precio_cents * cantidad

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${p.nombre}`}
      onClick={onCerrar}
      className="velo fixed inset-0 z-100 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-t-2xl border border-linea bg-panel shadow-2xl sm:rounded-2xl"
      >
        <div className="grid sm:grid-cols-2">
          {/* Arte grande: en el catálogo se ve recortado dentro de una card
              chica, y aquí es lo primero que el usuario quiere mirar. */}
          <div className="relative">
            <ImagenProducto
              url={p.imagen_url}
              alt={p.nombre}
              iconoSize={64}
              sizes="(min-width: 640px) 384px, 100vw"
              className="aspect-4/3 w-full rounded-t-2xl sm:aspect-4/5 sm:rounded-l-2xl sm:rounded-tr-none"
            />

            {agotado && (
              <>
                <span aria-hidden className="absolute inset-0 bg-[#080a0e]/45" />
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-error/90 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                  Agotado
                </span>
              </>
            )}

            <button
              ref={cerrarRef}
              onClick={onCerrar}
              aria-label="Cerrar"
              className="absolute right-2 top-2 rounded-lg bg-base/70 p-1.5 text-fuerte backdrop-blur-sm transition hover:bg-base"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
            <div>
              <h3 className="titulo">{p.nombre}</h3>
              <p className="cifra mt-1 text-sm text-tenue">
                {p.diamantes.toLocaleString('es-EC')} diamantes
                <span aria-hidden> 💎</span>
              </p>
            </div>

            <div className="flex items-baseline gap-2">
              <p className="cifra text-3xl font-semibold text-marca">{usd(p.precio_cents)}</p>
              <span className="text-xs text-tenue">por pin</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`chip ${agotado
                ? 'bg-error/15 text-error ring-1 ring-error/30'
                : 'bg-ok/15 text-ok ring-1 ring-ok/30'}`}>
                {agotado ? 'Sin stock' : `${stock} disponibles`}
              </span>
              <span className="chip bg-panel2 text-tenue"><Zap size={12} /> Entrega inmediata</span>
              <span className="chip bg-panel2 text-tenue"><ShieldCheck size={12} /> Pin oficial</span>
            </div>

            <p className="text-sm leading-relaxed text-tenue">
              Al comprarlo recibes el código del pin en <span className="text-fuerte">Mis compras</span>,
              listo para canjear en la página oficial de recargas. Se descuenta del saldo de tu billetera.
            </p>

            {agotado ? (
              <button
                onClick={() => onSolicitar(p)}
                disabled={ocupado || pedido}
                className={`btn mt-auto w-full ${pedido ? 'btn-suave' : 'btn-primario'}`}
              >
                {ocupado ? <Loader2 size={15} className="animate-spin" />
                  : pedido ? <><BellRing size={15} className="text-ok" /> Te avisaremos</>
                  : <><BellPlus size={15} /> Avísame cuando vuelva</>}
              </button>
            ) : (
              <div className="mt-auto flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-tenue">Cantidad</span>
                  <div className="flex items-center gap-1 rounded-lg border border-linea bg-panel2 p-1">
                    <button
                      onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                      disabled={cantidad <= 1}
                      aria-label="Quitar uno"
                      className="btn-icono h-7 min-w-7"
                    >
                      <Minus size={15} />
                    </button>
                    <span aria-live="polite" className="cifra w-8 text-center text-sm font-semibold text-fuerte">
                      {cantidad}
                    </span>
                    <button
                      onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
                      disabled={cantidad >= tope}
                      aria-label="Agregar uno"
                      className="btn-icono h-7 min-w-7"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-linea pt-3">
                  <span className="text-xs text-tenue">Total</span>
                  <span className="cifra text-lg font-semibold text-fuerte">{usd(total)}</span>
                </div>

                <button
                  onClick={() => onAgregar(p, cantidad)}
                  disabled={ocupado}
                  className="btn btn-primario w-full"
                >
                  {ocupado ? <Loader2 size={15} className="animate-spin" />
                    : <><Check size={15} /> Agregar al carrito</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
