'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Gamepad2, User, Zap, ArrowRight, RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { usd, mensajeError } from '@/lib/format'
import { supabaseBrowser } from '@/lib/supabase-client'
import { refrescarCarrito } from '@/lib/sesion'
import type { Producto } from './Catalogo'

type Paso = 'pagar' | 'id' | 'procesando' | 'exito' | 'error'

type Props = {
  producto: Producto | null
  saldo: number | null
  onCerrar: () => void
  onCompraExitosa?: (orderId: number) => void
}

/**
 * Modal de recarga automática:
 * 1. Pago con billetera
 * 2. Input de ID del jugador
 * 3. Procesando (canje automático)
 * 4. Resultado (éxito / error)
 */
export default function ModalRecarga({ producto, saldo, onCerrar, onCompraExitosa }: Props) {
  const [paso, setPaso] = useState<Paso>('pagar')
  const [idJugador, setIdJugador] = useState('')
  const [orderId, setOrderId] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState<{
    exito: boolean
    nombre_jugador: string | null
    error: string | null
    duracion_ms: number
  } | null>(null)
  const [etapaProceso, setEtapaProceso] = useState(0)
  const requestIdRef = useRef(crypto.randomUUID())
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const onCerrarRef = useRef(onCerrar)
  onCerrarRef.current = onCerrar
  const ocupadoRef = useRef(ocupado)
  ocupadoRef.current = ocupado

  const abierto = producto !== null

  useEffect(() => {
    if (!abierto) return
    setPaso('pagar')
    setIdJugador('')
    setOrderId(null)
    setOcupado(false)
    setResultado(null)
    setEtapaProceso(0)
    requestIdRef.current = crypto.randomUUID()

    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupadoRef.current) onCerrarRef.current()
    }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierto])

  // Animación de etapas del proceso
  useEffect(() => {
    if (paso !== 'procesando') return
    const etapas = [0, 1, 2, 3, 4]
    let i = 0
    const intervalo = setInterval(() => {
      i = Math.min(i + 1, etapas.length - 1)
      setEtapaProceso(etapas[i])
    }, 3000)
    return () => clearInterval(intervalo)
  }, [paso])

  const pagar = useCallback(async () => {
    if (!producto || ocupado) return
    setOcupado(true)

    try {
      const sb = supabaseBrowser()
      const { data, error } = await sb.rpc('fn_compra_directa', {
        p_product_id: producto.id,
        p_cantidad: 1,
        p_client_request_id: requestIdRef.current,
      })

      if (error) {
        toast.error(mensajeError(error.message))
        setOcupado(false)
        return
      }

      setOrderId(data as number)
      refrescarCarrito()
      setPaso('id')
    } catch {
      toast.error('Error de conexión. Intenta de nuevo.')
    }
    setOcupado(false)
  }, [producto, ocupado])

  const ejecutarCanje = useCallback(async () => {
    if (!orderId || !idJugador.trim() || ocupado) return

    const idLimpio = idJugador.trim()
    if (!/^\d{5,15}$/.test(idLimpio)) {
      toast.error('El ID debe tener entre 5 y 15 dígitos numéricos.')
      return
    }

    setOcupado(true)
    setPaso('procesando')
    setEtapaProceso(0)

    try {
      const sb = supabaseBrowser()
      const { data: { session } } = await sb.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/recarga/ejecutar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ order_id: orderId, id_jugador: idLimpio }),
      })

      const data = await res.json()

      setResultado({
        exito: data.exito ?? false,
        nombre_jugador: data.nombre_jugador ?? null,
        error: data.mensaje ?? data.error ?? null,
        duracion_ms: data.duracion_total_ms ?? 0,
      })

      if (data.exito) {
        setPaso('exito')
        onCompraExitosa?.(orderId)
      } else {
        setPaso('error')
      }
    } catch {
      setResultado({
        exito: false,
        nombre_jugador: null,
        error: 'Error de conexión con el servidor.',
        duracion_ms: 0,
      })
      setPaso('error')
    }
    setOcupado(false)
  }, [orderId, idJugador, ocupado, onCompraExitosa])

  const reintentar = useCallback(() => {
    setPaso('id')
    setResultado(null)
    setEtapaProceso(0)
  }, [])

  if (!producto) return null

  const p = producto
  const alcanza = (saldo ?? 0) >= p.precio_cents
  const puedeCerrar = !ocupado && paso !== 'procesando'

  const etapasProceso = [
    { icono: Zap, texto: 'Preparando recarga…' },
    { icono: Gamepad2, texto: 'Conectando con el servidor…' },
    { icono: User, texto: 'Validando jugador…' },
    { icono: ArrowRight, texto: 'Procesando canje…' },
    { icono: CheckCircle2, texto: 'Finalizando…' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recarga automática"
      onClick={puedeCerrar ? onCerrar : undefined}
      className="velo fixed inset-0 z-100 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-linea bg-panel shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-linea px-4 py-3">
          <h3 className="text-sm font-semibold">
            {paso === 'pagar' && 'Confirmar compra'}
            {paso === 'id' && 'Ingresa tu ID de jugador'}
            {paso === 'procesando' && 'Recargando…'}
            {paso === 'exito' && '¡Recarga exitosa!'}
            {paso === 'error' && 'Error en la recarga'}
          </h3>
          {puedeCerrar && (
            <button
              ref={cerrarRef}
              onClick={onCerrar}
              className="btn-icono"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* ===== PASO 1: PAGAR ===== */}
          {paso === 'pagar' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-linea bg-panel2 p-3">
                <Gamepad2 size={24} className="shrink-0 text-marca" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.nombre}</p>
                  <p className="cifra text-xs text-tenue">
                    {p.diamantes.toLocaleString('es-EC')} 💎
                  </p>
                </div>
                <p className="cifra text-lg font-semibold text-marca">{usd(p.precio_cents)}</p>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-tenue">Tu saldo</span>
                  <span className="cifra font-medium">{usd(saldo ?? 0)}</span>
                </div>
                {alcanza && (
                  <div className="flex justify-between">
                    <span className="text-tenue">Queda después</span>
                    <span className="cifra font-medium">{usd((saldo ?? 0) - p.precio_cents)}</span>
                  </div>
                )}
              </div>

              {!alcanza && (
                <p className="rounded-lg bg-alerta/10 px-3 py-2 text-xs text-alerta">
                  Te faltan {usd(p.precio_cents - (saldo ?? 0))} para esta compra.
                </p>
              )}

              <button
                onClick={pagar}
                disabled={ocupado || !alcanza}
                className="btn btn-primario w-full py-2.5"
              >
                {ocupado
                  ? <><Loader2 size={15} className="animate-spin" /> Procesando pago…</>
                  : `Pagar ${usd(p.precio_cents)}`}
              </button>

              <p className="text-center text-[11px] text-tenue">
                Se descuenta de tu billetera. Luego ingresarás tu ID de Free Fire.
              </p>
            </div>
          )}

          {/* ===== PASO 2: ID DEL JUGADOR ===== */}
          {paso === 'id' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-ok/30 bg-ok/5 p-3">
                <p className="flex items-center gap-2 text-xs font-medium text-ok">
                  <CheckCircle2 size={14} />
                  Pago confirmado — {usd(p.precio_cents)}
                </p>
              </div>

              <div>
                <label htmlFor="id-jugador" className="mb-1.5 block text-sm font-medium">
                  ID de usuario en Free Fire
                </label>
                <input
                  id="id-jugador"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ej: 7786673965"
                  value={idJugador}
                  onChange={(e) => setIdJugador(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') ejecutarCanje() }}
                  maxLength={15}
                  autoFocus
                  className="w-full rounded-lg border border-linea bg-panel2 px-3 py-2.5 text-center font-mono text-lg tracking-wider placeholder:text-tenue/50 focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30"
                />
              </div>

              <div className="rounded-lg bg-panel2 p-3 text-xs leading-relaxed text-tenue">
                <p className="font-medium text-fuerte">¿Dónde encuentro mi ID?</p>
                <p className="mt-1">
                  Abre Free Fire → toca tu foto de perfil → el número debajo de tu nombre es tu ID.
                </p>
              </div>

              <button
                onClick={ejecutarCanje}
                disabled={ocupado || idJugador.trim().length < 5}
                className="btn btn-primario w-full py-2.5"
              >
                {ocupado
                  ? <><Loader2 size={15} className="animate-spin" /> Validando…</>
                  : <><ArrowRight size={15} /> Confirmar recarga</>}
              </button>

              <p className="text-center text-[11px] text-tenue">
                Los diamantes se enviarán directamente a esta cuenta.
              </p>
            </div>
          )}

          {/* ===== PASO 3: PROCESANDO ===== */}
          {paso === 'procesando' && (
            <div className="space-y-5 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 size={40} className="animate-spin text-marca" />
                  <Gamepad2 size={18} className="absolute inset-0 m-auto text-marca" />
                </div>
              </div>

              <div className="space-y-2">
                {etapasProceso.map((etapa, i) => {
                  const Icono = etapa.icono
                  const activa = i === etapaProceso
                  const completada = i < etapaProceso

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-500 ${
                        activa
                          ? 'bg-marca/10 font-medium text-marca'
                          : completada
                            ? 'text-ok/70'
                            : 'text-tenue/40'
                      }`}
                    >
                      {completada
                        ? <CheckCircle2 size={14} className="text-ok" />
                        : activa
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Icono size={14} />}
                      {etapa.texto}
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-[11px] text-tenue">
                Esto puede tomar entre 10 y 30 segundos. No cierres esta ventana.
              </p>
            </div>
          )}

          {/* ===== PASO 4: ÉXITO ===== */}
          {paso === 'exito' && resultado && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok/15">
                <CheckCircle2 size={32} className="text-ok" />
              </div>

              <div>
                <h4 className="text-lg font-semibold">¡Recarga completada!</h4>
                <p className="mt-1 text-sm text-tenue">
                  Los diamantes ya fueron enviados.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-linea bg-panel2 p-4 text-left text-sm">
                {resultado.nombre_jugador && (
                  <div className="flex items-center justify-between">
                    <span className="text-tenue">Jugador</span>
                    <span className="font-semibold">{resultado.nombre_jugador}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-tenue">ID</span>
                  <span className="cifra font-medium">{idJugador}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-tenue">Producto</span>
                  <span className="font-medium">{p.nombre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-tenue">Precio</span>
                  <span className="cifra font-semibold text-marca">{usd(p.precio_cents)}</span>
                </div>
              </div>

              <button onClick={onCerrar} className="btn btn-primario w-full py-2.5">
                Listo
              </button>
            </div>
          )}

          {/* ===== PASO 5: ERROR ===== */}
          {paso === 'error' && resultado && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/15">
                <XCircle size={32} className="text-error" />
              </div>

              <div>
                <h4 className="text-lg font-semibold">No se pudo completar</h4>
                <p className="mt-1 text-sm text-tenue">
                  {resultado.error ?? 'Ocurrió un error durante el proceso de recarga.'}
                </p>
              </div>

              <div className="rounded-lg bg-alerta/10 p-3 text-left text-xs text-alerta">
                <p className="flex items-start gap-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  Tu pago fue procesado. Puedes reintentar la recarga o contactar soporte
                  si el problema persiste.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={reintentar} className="btn btn-suave flex-1 py-2.5">
                  <RotateCcw size={14} /> Reintentar
                </button>
                <button onClick={onCerrar} className="btn btn-primario flex-1 py-2.5">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
