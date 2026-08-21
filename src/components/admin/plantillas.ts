'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-client'

export type Ambito = 'individual' | 'novedades' | 'ambos'

export type Plantilla = {
  id: number; nombre: string; asunto: string; cuerpo: string
  ambito: Ambito; activo: boolean; orden: number
}

/** Lo que se puede escribir en una plantilla. El ejemplo es lo que sale de verdad. */
export const VARIABLES = [
  { v: '{nombre}',          d: 'Primer nombre',            e: 'Javier' },
  { v: '{nombre_completo}', d: 'Nombre completo',          e: 'Javier Dicado' },
  { v: '{saldo}',           d: 'Saldo actual',             e: '$0.50' },
  { v: '{compras}',         d: 'Cuántas veces compró',     e: '3' },
  { v: '{gastado}',         d: 'Total gastado',            e: '$12.00' },
  { v: '{favorito}',        d: 'Lo que más compra',        e: '341 Diamantes' },
  { v: '{ultimo_producto}', d: 'Lo último que compró',     e: '110 Diamantes' },
  { v: '{dias}',            d: 'Días sin comprar',         e: '5' },
  { v: '{tienda}',          d: 'Nombre de la tienda',      e: 'FFPINS' },
  { v: '{sitio}',           d: 'Dirección de la tienda',   e: 'storepinesff.store' },
] as const

/** Las plantillas del ámbito pedido, más las marcadas para ambos sitios. */
export function usePlantillas(ambito: Exclude<Ambito, 'ambos'>) {
  const [lista, setLista] = useState<Plantilla[]>([])

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabaseBrowser()
        .from('email_templates')
        .select('id, nombre, asunto, cuerpo, ambito, activo, orden')
        .eq('activo', true)
        .in('ambito', [ambito, 'ambos'])
        .order('orden')
      setLista((data as Plantilla[]) ?? [])
    }
    void cargar()
  }, [ambito])

  return lista
}

/**
 * Vista previa con las variables ya resueltas.
 *
 * La resuelve la base de datos y no el navegador porque es exactamente el mismo
 * texto que se enviará: si la calculara aquí a mano, la previa y el correo
 * podrían decir cosas distintas. Va con retraso para no consultar en cada tecla.
 */
export function usePrevia(texto: string, userId?: string) {
  const [previa, setPrevia] = useState('')

  useEffect(() => {
    if (!texto.trim()) { setPrevia(''); return }

    const t = setTimeout(async () => {
      const { data } = await supabaseBrowser()
        .rpc('fn_admin_previa', { p_texto: texto, p_user_id: userId ?? undefined })
      setPrevia((data as string) ?? texto)
    }, 400)

    return () => clearTimeout(t)
  }, [texto, userId])

  return previa || texto
}
