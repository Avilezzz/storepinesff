'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export type CampoDialogo = {
  etiqueta: string
  placeholder?: string
  valorInicial?: string
  requerido?: boolean
  multilinea?: boolean
}

type Props = {
  abierto: boolean
  titulo: string
  descripcion?: React.ReactNode
  campo?: CampoDialogo
  textoConfirmar?: string
  peligro?: boolean
  onConfirmar: (valor: string) => void | Promise<void>
  onCerrar: () => void
}

/**
 * Sustituye a window.confirm/prompt, que en móvil se ven como alertas del
 * navegador y rompen por completo el aspecto de la app.
 * En pantallas pequeñas sube desde abajo; en escritorio se centra.
 */
export default function Dialogo({
  abierto, titulo, descripcion, campo,
  textoConfirmar = 'Confirmar', peligro, onConfirmar, onCerrar,
}: Props) {
  const [valor, setValor] = useState(campo?.valorInicial ?? '')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!abierto) return
    setValor(campo?.valorInicial ?? '')
    setError('')
    const t = setTimeout(() => ref.current?.focus(), 60)

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierto, campo?.valorInicial, onCerrar])

  if (!abierto) return null

  async function confirmar() {
    if (campo?.requerido && !valor.trim()) {
      setError('Este campo es obligatorio.')
      return ref.current?.focus()
    }
    setOcupado(true)
    try { await onConfirmar(valor.trim()) } finally { setOcupado(false) }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={onCerrar}
      className="fixed inset-0 z-100 flex items-end justify-center velo sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-linea bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-5"
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold tracking-tight">{titulo}</h3>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-tenue transition hover:bg-panel2 hover:text-fuerte">
            <X size={18} />
          </button>
        </div>

        {descripcion && <div className="text-sm leading-relaxed text-tenue">{descripcion}</div>}

        {campo && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-tenue">{campo.etiqueta}</span>
            {campo.multilinea ? (
              <textarea
                ref={ref as React.RefObject<HTMLTextAreaElement>}
                rows={3} className="campo resize-none" placeholder={campo.placeholder}
                value={valor} onChange={(e) => { setValor(e.target.value); setError('') }}
              />
            ) : (
              <input
                ref={ref as React.RefObject<HTMLInputElement>}
                className="campo" placeholder={campo.placeholder}
                value={valor} onChange={(e) => { setValor(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && confirmar()}
              />
            )}
            {error && <span className="mt-1.5 block text-xs text-error">{error}</span>}
          </label>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onCerrar} className="btn btn-suave flex-1">Cancelar</button>
          <button onClick={confirmar} disabled={ocupado}
            className={`btn flex-1 ${peligro ? 'btn-peligro' : 'btn-primario'}`}>
            {ocupado ? 'Un momento…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
