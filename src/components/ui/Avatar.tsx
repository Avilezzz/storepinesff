'use client'

/**
 * Avatar con la inicial del nombre, al estilo de las cuentas de Google:
 * el color se deriva del propio nombre, así cada usuario mantiene siempre
 * el mismo y se reconoce de un vistazo.
 */
const PALETA = [
  ['#1a73e8', '#e8f0fe'], // azul
  ['#d93025', '#fce8e6'], // rojo
  ['#188038', '#e6f4ea'], // verde
  ['#e37400', '#fef7e0'], // ámbar
  ['#9334e6', '#f3e8fd'], // morado
  ['#12a4af', '#e4f7f8'], // turquesa
  ['#c5221f', '#fce8e6'], // granate
  ['#3949ab', '#e8eaf6'], // índigo
]

function tono(nombre: string) {
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0
  return PALETA[h % PALETA.length]
}

export default function Avatar({ nombre, size = 32 }: { nombre: string; size?: number }) {
  const limpio = nombre?.trim() || '?'
  const [texto, fondo] = tono(limpio)

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold select-none"
      style={{
        width: size,
        height: size,
        background: fondo,
        color: texto,
        fontSize: size * 0.44,
        lineHeight: 1,
      }}
    >
      {limpio.charAt(0).toUpperCase()}
    </span>
  )
}
