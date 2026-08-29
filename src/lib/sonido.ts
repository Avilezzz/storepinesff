/**
 * Los blips del asistente, al estilo de los diálogos de consola de 8 bits.
 *
 * Se generan con osciladores del navegador en vez de reproducir archivos: pesan
 * cero, no hay que descargar nada y cada blip suena ligeramente distinto, que
 * es justo lo que hace que no canse.
 *
 * El navegador no deja crear audio hasta que el usuario toca algo, así que el
 * contexto nace perezoso: la primera nota llega cuando ya hubo un gesto.
 */

let ctx: AudioContext | null = null
let ultimo = 0

const CLAVE = 'ffpins:sonido'

/** Silenciado o no. Se recuerda por navegador; el valor por defecto es sonar. */
export function sonidoActivo(): boolean {
  try { return localStorage.getItem(CLAVE) !== 'off' } catch { return true }
}

export function alternarSonido(): boolean {
  const nuevo = !sonidoActivo()
  try { localStorage.setItem(CLAVE, nuevo ? 'on' : 'off') } catch {}
  return nuevo
}

function contexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  try {
    const Clase = window.AudioContext ?? (window as unknown as {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!Clase) return null
    ctx = new Clase()
  } catch {
    return null
  }
  return ctx
}

/**
 * Una nota corta y seca. `square` es la onda de las consolas viejas; la caída
 * exponencial del volumen evita el chasquido que deja un corte brusco.
 */
function nota(hz: number, ms: number, volumen: number, forma: OscillatorType = 'square') {
  const a = contexto()
  if (!a) return

  // Si el navegador lo dejó suspendido tras un cambio de pestaña, se reanuda.
  if (a.state === 'suspended') void a.resume()

  const osc = a.createOscillator()
  const gan = a.createGain()

  osc.type = forma
  osc.frequency.value = hz

  const ahora = a.currentTime
  gan.gain.setValueAtTime(0, ahora)
  gan.gain.linearRampToValueAtTime(volumen, ahora + 0.005)
  gan.gain.exponentialRampToValueAtTime(0.0001, ahora + ms / 1000)

  osc.connect(gan).connect(a.destination)
  osc.start(ahora)
  osc.stop(ahora + ms / 1000 + 0.02)
}

/**
 * El tecleo mientras la respuesta se escribe.
 *
 * Lleva su propio freno: el modelo puede soltar veinte trozos en un suspiro y
 * sin límite sonaría a interferencia en vez de a diálogo.
 */
export function blip() {
  if (!sonidoActivo()) return

  const ahora = Date.now()
  if (ahora - ultimo < 55) return
  ultimo = ahora

  // Un poco de azar en el tono: dos blips idénticos seguidos suenan a error.
  nota(440 + Math.random() * 180, 45, 0.05)
}

/** Al enviar la pregunta: dos notas hacia arriba, como un botón de menú. */
export function envio() {
  if (!sonidoActivo()) return
  nota(520, 50, 0.06)
  setTimeout(() => nota(700, 60, 0.05), 55)
}

/** Al terminar de responder: acorde corto de "listo". */
export function fin() {
  if (!sonidoActivo()) return
  nota(660, 70, 0.05)
  setTimeout(() => nota(880, 90, 0.045), 80)

  // En el teléfono, un toque muy corto acompaña al sonido.
  try { navigator.vibrate?.(12) } catch {}
}

/** Al abrir el chat: la mascota "aparece". */
export function abrir() {
  if (!sonidoActivo()) return
  nota(392, 55, 0.045)
  setTimeout(() => nota(587, 70, 0.04), 60)
}

/**
 * La fanfarria de los avisos: el arpegio de "logro desbloqueado" de toda la
 * vida. Cada tipo tiene su melodía para que se reconozca sin mirar la pantalla,
 * y la mala noticia baja en vez de subir.
 *
 * Es la misma escala de volumen que el resto: un aviso no debe pegar un susto.
 */
const FANFARRIA: Record<string, { hz: number[]; paso: number; forma?: OscillatorType }> = {
  compra: { hz: [523, 659, 784, 1047], paso: 70 },                    // do-mi-sol-do
  premio: { hz: [784, 988, 1319],      paso: 60 },                    // monedas
  stock:  { hz: [659, 880],            paso: 65 },
  alerta: { hz: [392, 294],            paso: 110, forma: 'triangle' },
}

const VIBRA: Record<string, number[]> = {
  compra: [14, 40, 14, 40, 22],
  premio: [12, 35, 18],
  stock:  [14, 45, 14],
  alerta: [26, 60, 26],
}

export function fanfarria(tipo: string) {
  try { navigator.vibrate?.(VIBRA[tipo] ?? [14]) } catch {}

  if (!sonidoActivo()) return
  const f = FANFARRIA[tipo] ?? FANFARRIA.stock
  f.hz.forEach((hz, i) => {
    // La última nota dura más: es la que cierra el acorde.
    const largo = i === f.hz.length - 1 ? 190 : 80
    setTimeout(() => nota(hz, largo, 0.055, f.forma), i * f.paso)
  })
}
