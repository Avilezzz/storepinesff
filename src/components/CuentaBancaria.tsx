'use client'

import { useState } from 'react'
import { Copy, Check, Landmark } from 'lucide-react'
import { toast } from 'sonner'

type Cuenta = {
  banco: string; tipo_cuenta: string; numero_cuenta: string
  titular: string; identificacion: string; email_contacto: string | null
}

/** Copiar el número de cuenta a mano en el celular es la parte más molesta
 *  de pagar por transferencia; aquí va a un toque. */
export default function CuentaBancaria({ cuenta }: { cuenta: Cuenta }) {
  const [copiado, setCopiado] = useState<string | null>(null)

  async function copiar(valor: string, que: string) {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(valor)
      setTimeout(() => setCopiado(null), 1600)
      toast.success(`${que} copiado`)
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto a mano.')
    }
  }

  return (
    <div className="tarjeta p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-marca">
        <Landmark size={15} /> {cuenta.banco}
      </p>

      <div className="mt-3 space-y-2 text-sm">
        <Copiable etiqueta="N.º de cuenta" valor={cuenta.numero_cuenta} mono
          copiado={copiado === cuenta.numero_cuenta}
          onCopiar={() => copiar(cuenta.numero_cuenta, 'Número de cuenta')} />
        <Dato etiqueta="Tipo" valor={cuenta.tipo_cuenta} />
        <Dato etiqueta="Titular" valor={cuenta.titular} />
        <Copiable etiqueta="C.I." valor={cuenta.identificacion} mono
          copiado={copiado === cuenta.identificacion}
          onCopiar={() => copiar(cuenta.identificacion, 'Cédula')} />
        {cuenta.email_contacto && <Dato etiqueta="Correo" valor={cuenta.email_contacto} />}
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs text-tenue">{etiqueta}</span>
      <span className="truncate text-right">{valor}</span>
    </div>
  )
}

function Copiable({ etiqueta, valor, mono, copiado, onCopiar }: {
  etiqueta: string; valor: string; mono?: boolean; copiado: boolean; onCopiar: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-tenue">{etiqueta}</span>
      <button onClick={onCopiar}
        className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-panel2 ${
          mono ? 'font-mono tracking-wide' : ''}`}>
        <span className="truncate font-medium">{valor}</span>
        {copiado ? <Check size={13} className="shrink-0 text-ok" />
          : <Copy size={13} className="shrink-0 text-tenue" />}
      </button>
    </div>
  )
}
