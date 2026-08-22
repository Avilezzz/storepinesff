import type { MetadataRoute } from 'next'
import { SITIO } from '@/lib/seo'

/**
 * Solo entran las páginas públicas y con contenido. La billetera, el carrito o
 * el panel no van: son privadas, Google no puede verlas y ofrecerlas solo gasta
 * el presupuesto de rastreo en puertas cerradas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const hoy = new Date()

  return [
    { url: SITIO,                     lastModified: hoy, changeFrequency: 'daily',   priority: 1 },
    { url: `${SITIO}/login`,          lastModified: hoy, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${SITIO}/registro`,       lastModified: hoy, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${SITIO}/legal/terminos`, lastModified: hoy, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITIO}/legal/privacidad`, lastModified: hoy, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
