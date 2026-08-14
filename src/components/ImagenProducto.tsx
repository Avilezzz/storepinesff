import Image from 'next/image'
import { Gem } from 'lucide-react'

/**
 * Imagen de un producto, con respaldo al icono de diamante cuando todavía no
 * se ha subido ninguna desde el panel admin. El contenedor debe traer su propio
 * tamaño: la imagen lo llena con `fill`.
 */
export default function ImagenProducto({
  url, alt, className = '', sizes = '160px', iconoSize = 17, priority = false, zoom = false,
}: {
  url?: string | null
  alt: string
  className?: string
  sizes?: string
  iconoSize?: number
  priority?: boolean
  /** Acerca la imagen al pasar el cursor por la card contenedora (`group`). */
  zoom?: boolean
}) {
  if (!url) {
    return (
      <span className={`grid place-items-center bg-panel2 text-marca ${className}`}>
        <Gem size={iconoSize} />
      </span>
    )
  }

  return (
    <span className={`relative block overflow-hidden bg-panel2 ${className}`}>
      <Image src={url} alt={alt} fill sizes={sizes} priority={priority}
        className={`object-cover transition duration-300 ${zoom ? 'group-hover:scale-105' : ''}`} />
    </span>
  )
}
