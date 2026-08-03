/**
 * El dinero viaja siempre como entero de centavos. Nunca como decimal:
 * 0.1 + 0.2 !== 0.3 en coma flotante, y eso descuadra una caja.
 */
export const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Convierte lo que el usuario escribe ("12,50" o "12.5") a centavos exactos. */
export function aCentavos(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(limpio)) return null
  return Math.round(parseFloat(limpio) * 100)
}

export const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

/** Traduce los códigos de error que lanzan las funciones de Postgres. */
export function mensajeError(raw: string | undefined): string {
  if (!raw) return 'Ocurrió un error inesperado.'
  const m = raw.toUpperCase()
  if (m.includes('SALDO_INSUFICIENTE')) return 'No tienes saldo suficiente. Recarga tu billetera.'
  if (m.includes('STOCK_INSUFICIENTE')) {
    const p = raw.split('STOCK_INSUFICIENTE:')[1]?.split('"')[0]?.trim()
    return p ? `Ya no queda stock de ${p}. Ajusta la cantidad.` : 'Ya no queda stock suficiente.'
  }
  if (m.includes('CARRITO_VACIO'))      return 'Tu carrito está vacío.'
  if (m.includes('YA_PROCESADA'))       return 'Esa solicitud ya fue procesada.'
  if (m.includes('RECLAMO_DUPLICADO'))  return 'Ya existe un reclamo para ese pin.'
  if (m.includes('MOTIVO_REQUERIDO'))   return 'Debes indicar un motivo.'
  if (m.includes('SOLO_ADMIN'))         return 'No tienes permisos para esta acción.'
  if (m.includes('TOPUP_REF_UQ'))       return 'Ese número de comprobante ya fue registrado.'
  if (m.includes('ROW-LEVEL SECURITY') || m.includes('ROW LEVEL SECURITY'))
    return 'Tienes 3 solicitudes de recarga pendientes. Espera a que se revisen.'
  if (m.includes('INVALID LOGIN'))      return 'Correo o contraseña incorrectos.'
  if (m.includes('USER ALREADY REGISTERED') || m.includes('ALREADY BEEN REGISTERED'))
    return 'Ese correo ya está registrado.'
  if (m.includes('PROFILES_TELEFONO_CHECK')) return 'El número de teléfono no es válido.'
  return raw
}
