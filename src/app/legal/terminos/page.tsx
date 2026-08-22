import type { Metadata } from 'next'
import DocumentoLegal from '@/components/DocumentoLegal'
import { TERMINOS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — FFPINS',
  description: 'Cómo funciona la tienda: saldo, compras, entrega de pines, reclamos y devoluciones.',
}

export default function Terminos() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones"
      entrada="Las reglas de la tienda: cómo funciona el saldo, qué pasa si un pin falla y qué puedes esperar de nosotros. Léelo antes de comprar; está escrito para entenderse."
      secciones={TERMINOS}
    />
  )
}
