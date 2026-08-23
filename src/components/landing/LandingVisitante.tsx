'use client'

import type { Producto } from '@/components/Catalogo'
import HeroVisitante from './HeroVisitante'
import PasosSistema from './PasosSistema'
import BeneficiosSistema from './BeneficiosSistema'
import CatalogoVisitante from './CatalogoVisitante'
import BancosConfianza from './BancosConfianza'
import FaqVisitante from './FaqVisitante'

export default function LandingVisitante({ productos }: { productos: Producto[] }) {
  return (
    <div className="flex flex-col">
      <HeroVisitante />
      <PasosSistema />
      <BeneficiosSistema />
      <CatalogoVisitante productos={productos} />
      <BancosConfianza />
      <FaqVisitante />
    </div>
  )
}
