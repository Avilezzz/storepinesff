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

/** Toda fecha que ve el usuario se muestra en hora de Ecuador (UTC-5), sin
 *  importar dónde corra el servidor ni cómo tenga configurado el reloj él. */
export const ZONA = 'America/Guayaquil'

const FORMATO_FECHA = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA,
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
})

/**
 * Fecha y hora de Ecuador como "14/08/2026, 12:36 p. m.".
 *
 * El texto se arma pieza por pieza en vez de dejárselo a `toLocaleString`:
 * Node y el navegador traen versiones distintas de ICU y separan el "p. m."
 * con espacios distintos (U+202F vs. espacio normal). Se ve igual, pero React
 * lo considera texto diferente y rompe la hidratación.
 */
export function fecha(iso: string): string {
  const partes = FORMATO_FECHA.formatToParts(new Date(iso))
  const v = (t: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === t)?.value ?? ''
  const periodo = v('dayPeriod').replace(/[\u202f\u00a0]/g, ' ').toLowerCase()
  return `${v('day')}/${v('month')}/${v('year')}, ${v('hour')}:${v('minute')} ${periodo}`.trimEnd()
}

/** Hoy en Ecuador como YYYY-MM-DD, para inputs de tipo date.
 *  `toISOString()` daría la fecha en UTC: desde las 19:00 de Ecuador ya
 *  devuelve el día siguiente. */
export function hoyEcuador(): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const parte = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)!.value
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

/** Fecha suelta (columna `date`, sin hora) a formato local. Se parte el texto
 *  a mano: pasarla por `new Date()` la leería como medianoche UTC y restaría
 *  un día al mostrarla en Ecuador. */
export function soloFecha(ymd: string): string {
  const [a, m, d] = ymd.split('-')
  return d && m && a ? `${d}/${m}/${a}` : ymd
}

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
  if (m.includes('PERFIL_INCOMPLETO'))  return 'Agrega tu teléfono en Mi cuenta antes de comprar.'
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
