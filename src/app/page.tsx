import { supabasePublic } from '@/lib/supabase'
import Catalogo, { type Producto } from '@/components/Catalogo'
import HeroPromos from '@/components/HeroPromos'

// El catálogo se renderiza una vez y se sirve desde la CDN durante 60 s.
// El stock exacto no depende de esta caché: llega por Realtime al montar.
export const revalidate = 60

export default async function Home() {
  const { data } = await supabasePublic()
    .from('products')
    .select('id, slug, nombre, diamantes, precio_cents, stock_disponible, imagen_url')
    .eq('activo', true)
    .order('orden')

  return (
    <>
      {/* El título de la tienda vive aquí, oculto: el carrusel es una pieza
          visual y los buscadores igual necesitan un H1 con sentido. */}
      <h1 className="sr-only">Diamantes Free Fire — pines con entrega inmediata</h1>

      <HeroPromos />

      <Catalogo productos={(data as Producto[]) ?? []} />
    </>
  )
}
