import { supabasePublic } from '@/lib/supabase'
import type { Producto } from '@/components/Catalogo'
import HomeContainer from '@/components/HomeContainer'
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
      {/* Datos estructurados Schema.org para Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLdProductos(productos), jsonLdPreguntas()]),
        }}
      />

      <h1 className="sr-only">
        Diamantes Free Fire en Ecuador — pines con entrega inmediata y pago por transferencia
      </h1>

      <HomeContainer productos={productos} />
    </>
  )
}
