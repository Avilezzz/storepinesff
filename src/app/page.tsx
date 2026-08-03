import { Zap, ShieldCheck, Landmark } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase'
import Catalogo, { type Producto } from '@/components/Catalogo'

// El catálogo se renderiza una vez y se sirve desde la CDN durante 60 s.
// El stock exacto no depende de esta caché: llega por Realtime al montar.
export const revalidate = 60

const VENTAJAS = [
  { Icono: Zap, txt: 'Entrega inmediata' },
  { Icono: ShieldCheck, txt: 'Códigos únicos' },
  { Icono: Landmark, txt: 'Pago por transferencia' },
]

export default async function Home() {
  const { data } = await supabasePublic()
    .from('products')
    .select('id, slug, nombre, diamantes, precio_cents, stock_disponible')
    .eq('activo', true)
    .order('orden')

  return (
    <>
      <section className="aura border-b border-linea px-4 py-10 text-center sm:py-14">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          Diamantes <span className="text-marca">Free Fire</span>
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-tenue">
          Compra tu pin y recibe el código al instante. Recarga tu saldo por
          transferencia y compra cuando quieras.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-tenue">
          {VENTAJAS.map(({ Icono, txt }) => (
            <span key={txt} className="inline-flex items-center gap-1.5">
              <Icono size={13} className="text-marca" /> {txt}
            </span>
          ))}
        </div>
      </section>

      <Catalogo productos={(data as Producto[]) ?? []} />
    </>
  )
}
