'use client'

import { useSesion } from '@/lib/sesion'
import Catalogo, { type Producto } from '@/components/Catalogo'
import HeroPromos from '@/components/HeroPromos'
import LandingVisitante from '@/components/landing/LandingVisitante'

export default function HomeContainer({ productos }: { productos: Producto[] }) {
  const { uid, cargando } = useSesion()

  // Si el usuario tiene sesión activa, ingresa de lleno al sistema interno
  if (uid) {
    return (
      <div className="flex flex-col">
        <HeroPromos />
        <Catalogo productos={productos} />
      </div>
    )
  }

  // Si no hay sesión (visitante o aún no registrado), se le muestra la landing minimalista explicativa
  return <LandingVisitante productos={productos} />
}
