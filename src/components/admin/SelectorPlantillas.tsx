'use client'

import { useState } from 'react'
import { FileText, Braces, ChevronDown } from 'lucide-react'
import { VARIABLES, usePlantillas, type Ambito, type Plantilla } from './plantillas'

/**
 * Chips de plantillas + la chuleta de variables.
 * Se comparte entre el correo a un cliente y las campañas: son el mismo motor,
 * así que escribir en un sitio o en el otro se siente igual.
 */
export default function SelectorPlantillas({ ambito, onElegir, onInsertar }: {
  ambito: Exclude<Ambito, 'ambos'>
  onElegir: (p: Plantilla) => void
  onInsertar?: (variable: string) => void
}) {
  const plantillas = usePlantillas(ambito)
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="mb-3.5">
      {plantillas.length > 0 && (
        <>
          <p className="etiqueta mb-1.5 flex items-center gap-1.5">
            <FileText size={12} /> Plantillas
          </p>
          <div className="sin-barra flex gap-1.5 overflow-x-auto pb-0.5">
            {plantillas.map((p) => (
              <button key={p.id} type="button" onClick={() => onElegir(p)}
                className="chip shrink-0 border border-linea bg-panel2 px-2.5 py-1.5 text-tenue transition hover:border-marca/50 hover:text-marca">
                {p.nombre}
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" onClick={() => setAbierto(!abierto)}
        className="enlace mt-2 text-[11px] hover:text-marca">
        <Braces size={11} /> Variables disponibles
        <ChevronDown size={11} className={`transition ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="mt-2 rounded-lg border border-linea bg-panel2 p-3">
          <div className="grid gap-1.5 sm:grid-cols-2">
            {VARIABLES.map((x) => (
              <button key={x.v} type="button"
                onClick={() => onInsertar?.(x.v)}
                className="flex items-baseline gap-2 rounded px-1.5 py-1 text-left transition hover:bg-panel">
                <code className="cifra shrink-0 text-[11px] text-marca">{x.v}</code>
                <span className="min-w-0 flex-1 truncate text-[11px] text-tenue">{x.d}</span>
                <span className="shrink-0 text-[10px] text-tenue/60">{x.e}</span>
              </button>
            ))}
          </div>
          {onInsertar && (
            <p className="mt-2 text-[10px] text-tenue/60">Toca una para insertarla en el mensaje.</p>
          )}
        </div>
      )}
    </div>
  )
}
