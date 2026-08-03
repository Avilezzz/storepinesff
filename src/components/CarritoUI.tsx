'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2, ShoppingCart, Gem, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase-client'
import { refrescarCarrito } from '@/lib/sesion'
import { usd, mensajeError } from '@/lib/format'

export type LineaCarrito = {
  cantidad: number
  producto: {
    id: string; nombre: string; diamantes: number
    precio_cents: number; stock_disponible: number; activo: boolean
  }
}

export default function CarritoUI({ lineas, saldo }: { lineas: LineaCarrito[]; saldo: number }) {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [pagando, setPagando] = useState(false)

  // Mismo identificador durante toda la visita: si el usuario da doble clic o
  // se le cae la red y reintenta, fn_checkout devuelve la orden ya creada en
  // vez de cobrar dos veces.
  const requestId = useRef<string>(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  )

  const total = lineas.reduce((s, l) => s + l.cantidad * l.producto.precio_cents, 0)
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0)
  const alcanza = saldo >= total
  const conProblema = lineas.some((l) => l.cantidad > l.producto.stock_disponible)

  async function cambiar(productId: string, cantidad: number, nombre: string) {
    setOcupado(true)
    const { error } = await sb.rpc('fn_cart_set', { p_product_id: productId, p_cantidad: cantidad })
    setOcupado(false)
    if (error) return toast.error(mensajeError(error.message))
    if (cantidad === 0) toast(`${nombre} quitado del carrito`)
    refrescarCarrito()
    router.refresh()
  }

  async function pagar() {
    setPagando(true)
    const { data, error } = await sb.rpc('fn_checkout', { p_client_request_id: requestId.current })

    if (error) {
      setPagando(false)
      toast.error(mensajeError(error.message))
      router.refresh()   // refresca stock y saldo tras un fallo
      return
    }

    refrescarCarrito()
    toast.success('¡Compra lista! Tus pines ya están disponibles.')
    router.replace(`/mis-compras/${data}`)
  }

  if (lineas.length === 0) {
    return (
      <div className="tarjeta flex flex-col items-center gap-3 px-6 py-14 text-center">
        <ShoppingCart size={26} strokeWidth={1.5} className="text-tenue" />
        <p className="text-sm text-tenue">Tu carrito está vacío</p>
        <Link href="/" className="btn btn-primario mt-1">Ver los pines</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
      <div className="space-y-2.5">
        {lineas.map(({ cantidad, producto: p }) => {
          const excede = cantidad > p.stock_disponible
          const tope = Math.min(p.stock_disponible, 50)

          return (
            <div key={p.id} className="tarjeta p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-panel2 text-marca">
                  <Gem size={17} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nombre}</p>
                  <p className="cifra text-xs text-tenue">{usd(p.precio_cents)} c/u</p>
                </div>

                <p className="cifra text-sm font-semibold">{usd(cantidad * p.precio_cents)}</p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-linea pt-3">
                <button onClick={() => cambiar(p.id, 0, p.nombre)} disabled={ocupado}
                  className="btn-icono" aria-label={`Quitar ${p.nombre}`}>
                  <Trash2 size={16} />
                </button>

                <div className="flex items-center gap-1">
                  <button onClick={() => cambiar(p.id, cantidad - 1, p.nombre)} disabled={ocupado}
                    className="btn-icono" aria-label="Quitar una unidad">
                    <Minus size={16} />
                  </button>
                  <span className="cifra w-9 text-center text-sm font-semibold">{cantidad}</span>
                  <button onClick={() => cambiar(p.id, cantidad + 1, p.nombre)}
                    disabled={ocupado || cantidad >= tope}
                    className="btn-icono" aria-label="Añadir una unidad">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {excede && (
                <p className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-error/10 px-2.5 py-1.5 text-xs text-error">
                  <AlertCircle size={13} /> Solo quedan {p.stock_disponible}. Reduce la cantidad.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <aside className="tarjeta h-fit space-y-2.5 p-4 lg:sticky lg:top-20">
        <p className="etiqueta">Resumen</p>

        <Fila k={`${unidades} artículo${unidades === 1 ? '' : 's'}`} v={usd(total)} />
        <div className="border-t border-linea pt-2.5">
          <Fila k="Tu saldo" v={usd(saldo)} />
          {alcanza && <Fila k="Queda después" v={usd(saldo - total)} />}
        </div>

        <div className="flex items-baseline justify-between border-t border-linea pt-2.5">
          <span className="text-sm font-medium">Total</span>
          <span className="cifra text-xl font-semibold text-marca">{usd(total)}</span>
        </div>

        {!alcanza && (
          <p className="rounded-lg bg-alerta/10 px-2.5 py-2 text-xs leading-relaxed text-alerta">
            Te faltan {usd(total - saldo)} para completar esta compra.
          </p>
        )}

        {alcanza ? (
          <button onClick={pagar} disabled={pagando || ocupado || conProblema}
            className="btn btn-primario w-full">
            {pagando ? <><Loader2 size={15} className="animate-spin" /> Procesando…</> : `Pagar ${usd(total)}`}
          </button>
        ) : (
          <Link href="/recargar" className="btn btn-primario w-full">Recargar saldo</Link>
        )}

        <p className="text-center text-[11px] leading-relaxed text-tenue">
          Se descuenta de tu billetera y los pines se entregan al instante.
        </p>
      </aside>
    </div>
  )
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-tenue">{k}</span>
      <span className="cifra font-medium">{v}</span>
    </div>
  )
}
