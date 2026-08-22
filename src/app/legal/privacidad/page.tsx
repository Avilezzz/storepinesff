import type { Metadata } from 'next'
import DocumentoLegal from '@/components/DocumentoLegal'
import { PRIVACIDAD } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de Privacidad — FFPINS',
  description: 'Qué datos personales tratamos, para qué y cuáles son tus derechos según la LOPDP del Ecuador.',
}

export default function Privacidad() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidad"
      entrada="Aquí te contamos, sin rodeos, qué datos tuyos guardamos, para qué los usamos y qué puedes exigirnos sobre ellos. Está redactada conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador."
      secciones={PRIVACIDAD}
    />
  )
}
