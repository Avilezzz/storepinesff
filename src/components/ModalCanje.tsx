'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, ExternalLink, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  abierto: boolean
  codigo: string | null      // el pin que el usuario va a canjear, si eligió uno
  urlEmbed: string
  urlExterna: string
  onCerrar: () => void
}

/**
 * Canje sin salir de la tienda: el widget del proveedor se carga en un iframe.
 *
 * Se apoya en que ese widget no envía `X-Frame-Options` ni `frame-ancestors`.
 * Si algún día los añade, el marco quedaría en blanco sin avisar a nadie, y no
 * hay forma de detectarlo desde aquí porque es otro origen y el navegador no
 * deja inspeccionarlo. Por eso el botón para abrirlo en una pestaña está
 * siempre visible, y a los pocos segundos aparece además un aviso explícito.
 */
export default function ModalCanje({ abierto, codigo, urlEmbed, urlExterna, onCerrar }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [tardando, setTardando] = useState(false)

  useEffect(() => {
    if (!abierto) return

    setCopiado(false)
    setTardando(false)
    const aviso = setTimeout(() => setTardando(true), 6000)

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(aviso)
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  async function copiar() {
    if (!codigo) return
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
      toast.success('Código copiado. Pégalo en el formulario.')
    } catch {
      toast.error('Tu navegador no permitió copiar. Selecciona el código a mano.')
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Canjear pin"
      className="fixed inset-0 z-100 flex flex-col bg-base/95 backdrop-blur-sm">

      <div className="flex items-center gap-2 border-b border-linea px-3 py-2.5">
        <p className="flex-1 truncate text-sm font-medium">Canjear tu pin</p>

        <a href={urlExterna} target="_blank" rel="noopener noreferrer"
          className="btn-icono" title="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva">
          <ExternalLink size={17} />
        </a>
        <button onClick={onCerrar} className="btn-icono" aria-label="Cerrar">
          <X size={19} />
        </button>
      </div>

      {codigo && (
        <div className="flex items-center gap-2 border-b border-linea bg-panel px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide">{codigo}</code>
          <button onClick={copiar} className="btn btn-primario shrink-0 px-3 py-1.5 text-xs">
            {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
          </button>
        </div>
      )}

      {tardando && (
        <div className="flex items-start gap-2 border-b border-linea bg-alerta/10 px-3 py-2.5 text-xs leading-relaxed text-alerta">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            ¿No carga o se ve en blanco? Algunos navegadores bloquean contenido incrustado.{' '}
            <a href={urlExterna} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              Ábrelo en una pestaña
            </a>.
          </span>
        </div>
      )}

      {/* sandbox sin allow-top-navigation: el widget no puede sacarnos de la
          tienda ni redirigir la pestaña por su cuenta. */}
      <iframe
        src={urlEmbed}
        title="Sitio de canje"
        className="min-h-0 w-full flex-1 border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
