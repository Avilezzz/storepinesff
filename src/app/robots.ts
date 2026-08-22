import type { MetadataRoute } from 'next'
import { SITIO } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Zonas privadas o sin valor de búsqueda. Bloquearlas evita que el
      // rastreador gaste tiempo en páginas que siempre le devolverán un login.
      disallow: ['/admin', '/billetera', '/carrito', '/mis-compras', '/cuenta',
                 '/recargar', '/completar-perfil', '/baja', '/auth'],
    },
    sitemap: `${SITIO}/sitemap.xml`,
    host: SITIO,
  }
}
