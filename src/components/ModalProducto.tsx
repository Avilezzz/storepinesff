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
  pvp: number
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
  producto, stock, ocupado, pedido, pvp, onAgregar, onSolicitar, onCerrar,
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
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-linea bg-panel shadow-2xl sm:max-h-none sm:overflow-visible sm:rounded-2xl"
      >
        <div className="sm:grid sm:grid-cols-2">
          {/* El arte grande solo tiene sentido en escritorio, donde ocupa una
              columna. En móvil se llevaba la pantalla entera y empujaba fuera
              de vista lo que el usuario vino a hacer: elegir cuántos y comprar.
              Ahí baja a miniatura junto al nombre. */}
          <div className="relative hidden sm:block">
            <ImagenProducto
              url={p.imagen_url}
              alt={p.nombre}
              iconoSize={64}
              sizes="384px"
              className="aspect-4/5 w-full rounded-l-2xl"
            />

            {agotado && (
              <>
                <span aria-hidden className="absolute inset-0 bg-[#080a0e]/45" />
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-error/90 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white shadow-lg">
                  Agotado
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
            {/* Asa: le dice al pulgar que esta hoja se puede cerrar. */}
            <span aria-hidden className="mx-auto -mt-1 h-1 w-10 rounded-full bg-linea sm:hidden" />

            <div className="flex items-start gap-3">
              <ImagenProducto
                url={p.imagen_url}
                alt=""
                iconoSize={26}
                sizes="64px"
                className={`size-16 shrink-0 rounded-xl sm:hidden ${agotado ? 'opacity-60' : ''}`}
              />

              <div className="min-w-0 flex-1">
                <h3 className="titulo truncate text-lg sm:whitespace-normal sm:text-[1.375rem]">{p.nombre}</h3>
                <div className="mt-1.5 flex items-baseline gap-2 sm:hidden">
                  <p className="cifra text-2xl font-semibold text-marca">{usd(p.precio_cents)}</p>
                  <span className="text-[11px] text-tenue">por pin</span>
                </div>
              </div>

              <button
                ref={cerrarRef}
                onClick={onCerrar}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-tenue transition hover:bg-panel2 hover:text-fuerte"
              >
                <X size={18} />
              </button>
            </div>

            <div className="hidden items-baseline gap-2 sm:flex">
              <p className="cifra text-3xl font-semibold text-marca">{usd(p.precio_cents)}</p>
              <span className="text-xs text-tenue">por pin</span>
            </div>

            <div className="rounded-xl border border-ok/30 bg-ok/10 px-3.5 py-3">
              <p className="text-xs text-tenue">PVP para tu cliente</p>
              <p className="cifra mt-0.5 text-xl font-bold text-ok">{usd(pvp)}</p>
              <p className="mt-1 text-xs text-tenue">Puedes vender este producto a ese precio y ganar {usd(pvp - p.precio_cents)} por pin.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`chip ${agotado
                ? 'bg-error/15 text-error ring-1 ring-error/30'
                : 'bg-ok/15 text-ok ring-1 ring-ok/30'}`}>
                {agotado ? 'Sin stock' : `${stock} disponibles`}
              </span>
              {/* Sellos de confianza: en móvil el espacio se reserva para la
                  compra, así que no compiten con ella. */}
              <span className="chip hidden bg-panel2 text-tenue sm:inline-flex"><Zap size={12} /> Entrega inmediata</span>
              <span className="chip hidden bg-panel2 text-tenue sm:inline-flex"><ShieldCheck size={12} /> Pin oficial</span>
            </div>

            <p className="text-xs leading-relaxed text-tenue sm:text-sm">
              Al comprarlo recibes el código del pin en <span className="text-fuerte">Mis compras</span>,
              listo para canjear en la página oficial de recargas. Se descuenta del saldo de tu billetera.
            </p>

            {agotado ? (
              <button
                onClick={() => onSolicitar(p)}
                disabled={ocupado || pedido}
                className={`btn mt-auto w-full py-2.5 sm:py-[0.5625rem] ${pedido ? 'btn-suave' : 'btn-primario'}`}
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
                      className="btn-icono h-9 min-w-9 sm:h-7 sm:min-w-7"
                    >
                      <Minus size={15} />
                    </button>
                    <span aria-live="polite" className="cifra w-9 text-center text-base font-semibold text-fuerte sm:w-8 sm:text-sm">
                      {cantidad}
                    </span>
                    <button
                      onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
                      disabled={cantidad >= tope}
                      aria-label="Agregar uno"
                      className="btn-icono h-9 min-w-9 sm:h-7 sm:min-w-7"
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
                  className="btn btn-primario w-full py-2.5 sm:py-[0.5625rem]"
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
