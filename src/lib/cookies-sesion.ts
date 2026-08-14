/**
 * La sesión no puede vivir en sessionStorage: el middleware y los Server
 * Components leen al usuario desde las cookies de la petición, y el navegador
 * nunca les manda sessionStorage. Se consigue lo mismo con cookies **de
 * sesión**: sin `Max-Age` ni `Expires`, el navegador las borra al cerrarse.
 */

type OpcionesCookie = {
  maxAge?: number
  expires?: Date | number | string
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: boolean | 'lax' | 'strict' | 'none'
}

/**
 * Quita la caducidad para que la cookie muera al cerrar el navegador.
 * El borrado explícito (`maxAge: 0`, que es como Supabase cierra sesión) se
 * respeta tal cual: sin él, cerrar sesión dejaría la cookie viva.
 */
export function cookieDeSesion<T extends OpcionesCookie>(opciones?: T): Partial<T> {
  if (!opciones) return {}
  if (opciones.maxAge === 0 || opciones.expires !== undefined && new Date(opciones.expires).getTime() <= Date.now()) {
    return opciones
  }
  const { maxAge: _maxAge, expires: _expires, ...resto } = opciones
  return resto as Partial<T>
}

/** Lee `document.cookie` en el formato que espera @supabase/ssr.
 *  Durante el prerender no hay `document`: el cliente de navegador se
 *  instancia igual al construir la página, y ahí no hay sesión que leer. */
export function leerCookiesDelNavegador() {
  if (typeof document === 'undefined') return []
  return document.cookie
    .split('; ')
    .filter(Boolean)
    .map((par) => {
      const i = par.indexOf('=')
      return {
        name: decodeURIComponent(par.slice(0, i)),
        value: decodeURIComponent(par.slice(i + 1)),
      }
    })
}

/** Escribe una cookie de sesión (o la borra, si viene con `maxAge: 0`). */
export function escribirCookieEnNavegador(
  name: string, value: string, opciones?: OpcionesCookie,
) {
  if (typeof document === 'undefined') return

  const o = cookieDeSesion(opciones)
  const partes = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${o.path ?? '/'}`,
    `SameSite=${o.sameSite === true ? 'Strict' : o.sameSite === false ? 'Lax' : (o.sameSite ?? 'lax')}`,
  ]
  if (o.domain) partes.push(`Domain=${o.domain}`)
  if (o.maxAge !== undefined) partes.push(`Max-Age=${o.maxAge}`)
  if (o.secure ?? window.location.protocol === 'https:') partes.push('Secure')

  document.cookie = partes.join('; ')
}
