'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export type Tema = 'claro' | 'oscuro'

/** Se lee también desde el script del layout: si cambia, cambiar allí. */
export const CLAVE_TEMA = 'tema'

export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  try { localStorage.setItem(CLAVE_TEMA, tema) } catch { /* modo privado */ }

  // La barra del navegador en móvil sigue al tema.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#0a0c10' : '#f6f7f9')
}

/**
 * Interruptor claro/oscuro. Hasta que monta muestra el icono de luna sin
 * estado: el servidor no sabe qué tema eligió el usuario y pintar aquí un
 * valor adivinado rompería la hidratación.
 */
export default function BotonTema({ className = '' }: { className?: string }) {
  const [tema, setTema] = useState<Tema | null>(null)

  useEffect(() => {
    setTema(document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro')
  }, [])

  function alternar() {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(siguiente)
    aplicarTema(siguiente)
  }

  const oscuro = tema === 'oscuro'

  return (
    <button
      onClick={alternar}
      className={`btn-icono ${className}`}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={oscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      {oscuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
