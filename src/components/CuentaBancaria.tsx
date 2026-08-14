'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Copy, Check, Landmark } from 'lucide-react'
import { toast } from 'sonner'

type Cuenta = {
  banco: string; tipo_cuenta: string; numero_cuenta: string
  titular: string; identificacion: string; email_contacto: string | null
}

/**
 * Identidad de cada banco: logo y color de marca. El logo va sobre una
 * pastilla blanca porque ambos vienen pensados para fondo claro — el azul
 * marino de Pichincha desaparecería sobre el panel oscuro de la tienda.
 */
const ALTO_LOGO = 22

const BANCOS: Record<string, { logo: string; color: string; ancho: number }> = {
  // El ancho sale de la proporción real del archivo: 1096×314 y 843×208.
  guayaquil: { logo: '/Banco_Guayaquil_logo.png', color: '#BD0F7C', ancho: 77 },
  pichincha: { logo: '/Banco_Pichincha_logo.png', color: '#FFDD00', ancho: 89 },
}

function identidad(banco: string) {
  const n = banco.toLowerCase()
  return BANCOS[Object.keys(BANCOS).find((k) => n.includes(k)) ?? ''] ?? null
}

/** Copiar el número de cuenta a mano en el celular es la parte más molesta
 *  de pagar por transferencia; aquí va a un toque. */
export default function CuentaBancaria({ cuenta }: { cuenta: Cuenta }) {
  const [copiado, setCopiado] = useState<string | null>(null)
  const marca = identidad(cuenta.banco)

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
    <div className="tarjeta relative overflow-hidden">
      {/* Tinte de la marca del banco, muy tenue: identifica la tarjeta de un
          vistazo sin pelearse con la legibilidad del texto. */}
      {marca && (
        <>
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5"
            style={{ background: marca.color }} />
          <span aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-2xl"
            style={{ background: marca.color }} />
        </>
      )}

      <div className="relative p-4">
        {marca ? (
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5">
            <Image src={marca.logo} alt={cuenta.banco}
              height={ALTO_LOGO} width={marca.ancho} className="h-[22px] w-auto" />
          </span>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-marca">
            <Landmark size={15} /> {cuenta.banco}
          </p>
        )}

        <div className="mt-3.5 space-y-2 text-sm">
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
