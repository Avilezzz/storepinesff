'use server'

import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/lib/supabase'

type Cambios = { nombre?: string; precio_cents?: number; imagen_url?: string | null; activo?: boolean }

export async function actualizarProducto(id: string, cambios: Cambios) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: { message: 'Tu sesión venció. Inicia sesión de nuevo.' } }
  const { data: admin, error: permiso } = await sb.rpc('is_admin')
  if (permiso || admin !== true) return { error: { message: 'SOLO_ADMIN' } }

  const patch: Cambios = {}
  if ('nombre' in cambios) {
    const nombre = cambios.nombre?.trim()
    if (!nombre || nombre.length > 80) return { error: { message: 'El título debe tener entre 1 y 80 caracteres.' } }
    patch.nombre = nombre.toLocaleUpperCase('es-EC')
  }
  if ('precio_cents' in cambios) {
    if (!Number.isSafeInteger(cambios.precio_cents) || cambios.precio_cents! <= 0)
      return { error: { message: 'Precio inválido.' } }
    patch.precio_cents = cambios.precio_cents
  }
  if ('activo' in cambios) {
    if (typeof cambios.activo !== 'boolean') return { error: { message: 'Visibilidad inválida.' } }
    patch.activo = cambios.activo
  }
  if ('imagen_url' in cambios) {
    const url = cambios.imagen_url
    const prefijo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${id}/`
    if (url !== null && (typeof url !== 'string' || !url.startsWith(prefijo)))
      return { error: { message: 'Imagen inválida.' } }
    patch.imagen_url = url
  }
  if (!Object.keys(patch).length) return { error: { message: 'No hay cambios para guardar.' } }

  // single exige una fila actualizada: RLS puede devolver cero filas sin error.
  const { data, error } = await sb.from('products').update(patch).eq('id', id)
    .select('id, nombre, precio_cents, imagen_url, activo').single()
  if (error || !data) return { error: { message: 'No se pudo guardar el producto. Revisa tu sesión y vuelve a intentarlo.' } }

  revalidatePath('/')
  revalidatePath('/admin/productos')
  revalidatePath('/carrito')
  return { error: null }
}
