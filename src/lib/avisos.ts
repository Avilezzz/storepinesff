/**
 * Avisos de la tienda: los banners que aparecen al entrar, uno tras otro.
 *
 * El módulo se llama "avisos" y no "anuncios" ni "publicidad" a propósito. Los
 * bloqueadores de anuncios cortan por patrón de URL, y PostgREST manda el
 * filtro en la propia dirección: un `PATCH /rest/v1/ads?id=eq.…` encaja con las
 * reglas de EasyList y el navegador ni siquiera llega a enviarlo.
 */

export type Audiencia = 'TODOS' | 'CLIENTES' | 'VISITANTES'

export type Aviso = {
  id: string
  titulo: string
  imagen_url: string
  imagen_movil_url: string | null
  href: string | null
  externo: boolean
  cta: string | null
  audiencia: Audiencia
  activo: boolean
  inicia_en: string | null
  termina_en: string | null
  orden: number
  created_at: string
}

/** Columnas del aviso. Se comparte para no desincronizar panel y tienda. */
export const CAMPOS_AVISO =
  'id, titulo, imagen_url, imagen_movil_url, href, externo, cta, audiencia, activo, inicia_en, termina_en, orden, created_at'

/** Lo que devuelve fn_admin_avisos_metricas para el panel. */
export type MetricasAvisos = {
  vistas_hoy: number
  clics_hoy: number
  activos: number
  por_aviso: {
    id: string
    vistas: number
    clics: number
    unicos: number
    ultimo: string | null
  }[]
}

export const METRICAS_VACIAS: MetricasAvisos = {
  vistas_hoy: 0, clics_hoy: 0, activos: 0, por_aviso: [],
}

export type EstadoAviso = 'VIGENTE' | 'PROGRAMADO' | 'VENCIDO' | 'PAUSADO'

/**
 * En qué punto de su vida está el aviso. La misma regla que aplica la política
 * de lectura en la base, para que el panel muestre exactamente lo que el
 * cliente va a ver.
 */
export function estadoAviso(a: Aviso, ahora = Date.now()): EstadoAviso {
  if (!a.activo) return 'PAUSADO'
  if (a.inicia_en && ahora < Date.parse(a.inicia_en)) return 'PROGRAMADO'
  if (a.termina_en && ahora > Date.parse(a.termina_en)) return 'VENCIDO'
  return 'VIGENTE'
}

/** Si le toca a este visitante según tenga o no sesión abierta. */
export const esParaMi = (a: Aviso, conSesion: boolean) =>
  a.audiencia === 'TODOS' || (conSesion ? a.audiencia === 'CLIENTES' : a.audiencia === 'VISITANTES')

/**
 * Un enlace es externo cuando de verdad sale del sitio. El campo `externo`
 * manda, pero una ruta interna nunca se abre en otra pestaña ni pasa por
 * `window.open`: eso rompería la navegación de la propia tienda.
 */
export const saleDelSitio = (a: Aviso) =>
  a.externo && !!a.href && /^https?:\/\//i.test(a.href)
