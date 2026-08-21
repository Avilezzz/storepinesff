import Image from 'next/image'

/** Proporción real de los archivos, para que next/image no deforme el logo. */
const CLARO = { src: '/logo-claro.png', w: 937, h: 240 }
const OSCURO = { src: '/logo-oscuro.png', w: 855, h: 240 }

/**
 * El logo tiene una versión por tema (el de oscuro es blanco y desaparecería
 * sobre fondo claro). Se pintan las dos y las alterna el CSS con `data-tema`,
 * no JavaScript: así no hay parpadeo en la primera carga ni desajuste de
 * hidratación, que es justo lo que pasaría si el `src` dependiera del estado.
 */
export default function Logo({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <>
      <Image src={CLARO.src} alt="FFPINS" width={CLARO.w} height={CLARO.h}
        className={`solo-claro ${className}`} priority />
      <Image src={OSCURO.src} alt="FFPINS" width={OSCURO.w} height={OSCURO.h}
        className={`solo-oscuro ${className}`} priority />
    </>
  )
}
