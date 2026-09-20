/**
 * De qué color es una imagen.
 *
 * Saca los dos colores que mejor representan el arte de un aviso para vestir
 * con ellos el marco, los rayos y el confeti. Corre en el navegador del panel,
 * una sola vez, cuando el admin elige el archivo: el resultado se guarda en la
 * fila del aviso y el cliente ya no analiza nada.
 *
 * No cuenta píxeles a secas. El píxel más repetido de un banner casi siempre
 * es el gris del fondo o el negro del borde, que no representan nada; lo que
 * hace suya a una imagen es el color vivo, aunque ocupe poco. Por eso cada
 * píxel vota con un peso: cuanto más saturado y menos apagado, más pesa su
 * voto. Los votos se agrupan por tono, no por color exacto, así los mil
 * tonos cálidos distintos de un degradado suman a un mismo candidato en vez de
 * repartirse y perder contra el gris.
 */

/** Los dos colores del arte, en hex. */
export type Paleta = { a: string; b: string }

/** Lado máximo al que se reduce la imagen antes de mirarla. Con 160 px sobra:
 *  los colores de un banner no cambian por mirarlo más grande, y así el
 *  análisis entero son 25.000 píxeles en vez de varios millones. */
const LADO = 160

/** Tonos en los que se reparten los votos. 24 casillas de 15°: suficiente para
 *  separar colores cercanos, sin trocear un mismo degradado. */
const CASILLAS = 24

/** Separación mínima de tono entre los dos colores elegidos. Por debajo de
 *  esto el degradado se ve de un solo color y no vale la pena. */
const SEPARACION = 35

type Voto = { peso: number; sen: number; cos: number; sat: number; luz: number }

function rgbAHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const luz = (max + min) / 2
  if (max === min) return [0, 0, luz]

  const d = max - min
  const sat = luz > 0.5 ? d / (2 - max - min) : d / (max + min)
  const tono = max === r ? ((g - b) / d + (g < b ? 6 : 0))
             : max === g ? (b - r) / d + 2
             :             (r - g) / d + 4
  return [tono * 60, sat, luz]
}

function hslAHex(tono: number, sat: number, luz: number): string {
  const h = ((tono % 360) + 360) % 360 / 360
  const q = luz < 0.5 ? luz * (1 + sat) : luz + sat - luz * sat
  const p = 2 * luz - q

  const canal = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    const v = t < 1 / 6 ? p + (q - p) * 6 * t
            : t < 1 / 2 ? q
            : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6
            :             p
    return Math.round(v * 255)
  }

  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(canal(h + 1 / 3))}${hex(canal(h))}${hex(canal(h - 1 / 3))}`
}

/** Distancia entre dos tonos por el lado corto de la rueda: 350° y 10° están
 *  a 20°, no a 340°. */
const distanciaTono = (x: number, y: number) => {
  const d = Math.abs(x - y) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Deja el color en un punto donde se vea bien sobre el panel claro y sobre el
 * oscuro. Un amarillo pastel casi blanco o un vino casi negro son fieles al
 * arte pero desaparecen contra el fondo, y el marco tiene que verse en los dos
 * temas sin repintarse.
 */
function usable(tono: number, sat: number, luz: number, masClaro: boolean): string {
  return hslAHex(
    tono,
    Math.min(Math.max(sat, 0.55), 0.92),
    // Uno de los dos sale más claro que el otro a propósito: un degradado
    // entre dos colores del mismo brillo no se lee como degradado.
    masClaro ? Math.min(Math.max(luz, 0.54), 0.66) : Math.min(Math.max(luz, 0.42), 0.54),
  )
}

/** Un color legible encima del que se le pase: negro o blanco, el que más
 *  contraste. Evita el botón amarillo con letras blancas que no se leen. */
export function textoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  // Luminancia relativa de la WCAG. El umbral 0.4 es donde el blanco deja de
  // ganar contraste frente al negro sobre estos colores.
  const l = 0.2126 * canal((n >> 16) & 255)
          + 0.7152 * canal((n >> 8) & 255)
          + 0.0722 * canal(n & 255)
  return l > 0.4 ? '#10131a' : '#ffffff'
}

/** Cuenta los votos de un lienzo ya pintado. Separado para poder probarlo. */
function votar(datos: Uint8ClampedArray): Voto[] {
  const casillas: Voto[] = Array.from({ length: CASILLAS },
    () => ({ peso: 0, sen: 0, cos: 0, sat: 0, luz: 0 }))

  for (let i = 0; i < datos.length; i += 4) {
    if (datos[i + 3] < 128) continue                        // transparente
    const [tono, sat, luz] = rgbAHsl(datos[i], datos[i + 1], datos[i + 2])

    // Fuera lo que no es color: el negro del fondo, el blanco del papel y los
    // grises. Son la mayoría de píxeles de un banner y no representan nada.
    if (luz < 0.12 || luz > 0.93 || sat < 0.15) continue

    // El voto pesa por lo vivo que es el color y por lo centrado que esté su
    // brillo: un color medio se ve; uno casi negro o casi blanco, no.
    const peso = sat * sat * (1 - Math.abs(luz - 0.5) * 1.2)
    if (peso <= 0) continue

    const c = casillas[Math.floor(tono / (360 / CASILLAS)) % CASILLAS]
    const rad = (tono * Math.PI) / 180
    c.peso += peso
    // Los tonos se promedian como ángulos, con seno y coseno: la media simple
    // entre 350° y 10° daría 180°, el color opuesto al real.
    c.sen += Math.sin(rad) * peso
    c.cos += Math.cos(rad) * peso
    c.sat += sat * peso
    c.luz += luz * peso
  }

  return casillas
}

const tonoDe = (c: Voto) => (Math.atan2(c.sen, c.cos) * 180) / Math.PI

/**
 * Los dos colores de un mapa de píxeles RGBA. Es la parte que decide, separada
 * del navegador a propósito: así se puede probar con imágenes inventadas sin
 * abrir un lienzo.
 */
export function paletaDeDatos(datos: Uint8ClampedArray): Paleta | null {
  const casillas = votar(datos).filter((c) => c.peso > 0)
  if (casillas.length === 0) return null

  const orden = [...casillas].sort((x, y) => y.peso - x.peso)
  const uno = orden[0]
  const tonoUno = tonoDe(uno)

  // El segundo es el tono con más votos que esté de verdad lejos del primero.
  // Si el arte es de un solo color, se inventa girando la rueda: un degradado
  // hacia un vecino sigue siendo fiel a la imagen y no la traiciona.
  const dos = orden.slice(1).find((c) => distanciaTono(tonoDe(c), tonoUno) >= SEPARACION)

  return {
    a: usable(tonoUno, uno.sat / uno.peso, uno.luz / uno.peso, true),
    b: dos
      ? usable(tonoDe(dos), dos.sat / dos.peso, dos.luz / dos.peso, false)
      : usable(tonoUno + 30, uno.sat / uno.peso, uno.luz / uno.peso - 0.1, false),
  }
}

/**
 * Los dos colores de una imagen ya cargada. Devuelve null cuando no hay color
 * que sacar —un arte en blanco y negro, o una imagen que el navegador no dejó
 * leer— y entonces el aviso se queda con los colores de la tienda.
 */
export function paletaDe(img: HTMLImageElement): Paleta | null {
  const escala = Math.min(LADO / (img.naturalWidth || LADO), LADO / (img.naturalHeight || LADO), 1)
  const ancho = Math.max(1, Math.round((img.naturalWidth || LADO) * escala))
  const alto = Math.max(1, Math.round((img.naturalHeight || LADO) * escala))

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto

  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, ancho, alto)

  try {
    return paletaDeDatos(ctx.getImageData(0, 0, ancho, alto).data)
  } catch {
    // Imagen de otro dominio sin permiso de lectura: el lienzo queda vetado.
    return null
  }
}

/** Carga la imagen y saca su paleta. Acepta un archivo recién elegido o la URL
 *  de un arte ya subido; con la URL puede fallar si el servidor no da permiso
 *  para leerla, y en ese caso devuelve null sin ruido. */
export function paletaDeOrigen(origen: File | string): Promise<Paleta | null> {
  return new Promise((listo) => {
    const url = typeof origen === 'string' ? origen : URL.createObjectURL(origen)
    const img = new Image()

    // Solo hace falta para las URL de otro dominio; con un archivo local el
    // atributo sobra pero tampoco molesta.
    if (typeof origen === 'string') img.crossOrigin = 'anonymous'

    const limpiar = () => { if (typeof origen !== 'string') URL.revokeObjectURL(url) }

    img.onload = () => {
      const p = (() => { try { return paletaDe(img) } catch { return null } })()
      limpiar()
      listo(p)
    }
    img.onerror = () => { limpiar(); listo(null) }
    img.src = url
  })
}
