import { supabasePublic } from '@/lib/supabase'
import Catalogo, { type Producto } from '@/components/Catalogo'
import HeroPromos from '@/components/HeroPromos'
import ContenidoSeo from '@/components/ContenidoSeo'
import { jsonLdProductos, jsonLdPreguntas } from '@/lib/seo'

// El catálogo se renderiza una vez y se sirve desde la CDN durante 60 s.
// El stock exacto no depende de esta caché: llega por Realtime al montar.
export const revalidate = 60

export default async function Home() {
  const { data } = await supabasePublic()
    .from('products')
    .select('id, slug, nombre, diamantes, precio_cents, stock_disponible, imagen_url')
    .eq('activo', true)
    .order('orden')

  const productos = (data as Producto[]) ?? []

  return (
    <>
      {/* Precios y stock reales para el buscador: es lo que permite que el
          resultado de Google muestre "$1.25" y si está disponible. Se genera
          desde la misma consulta que pinta el catálogo, así nunca se
          desincronizan. */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLdProductos(productos), jsonLdPreguntas()]),
        }} />

      {/* El título de la tienda vive aquí, oculto: el carrusel es una pieza
          visual y los buscadores igual necesitan un H1 con sentido. */}
      <h1 className="sr-only">
        Diamantes Free Fire en Ecuador — pines con entrega inmediata y pago por transferencia
      </h1>

      <HeroPromos />

      <Catalogo productos={productos} />

      <ContenidoSeo />
    </>
  )
}
