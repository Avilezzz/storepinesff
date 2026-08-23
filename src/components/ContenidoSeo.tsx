import Link from 'next/link'
import { Wallet, ShieldCheck, Zap, Landmark } from 'lucide-react'
import { PREGUNTAS } from '@/lib/seo'

/**
 * Contenido de la portada por debajo del catálogo.
 *
 * No es relleno para el buscador: son las dudas reales de quien compra por
 * primera vez y no conoce la tienda. Que además sea lo que Google necesita para
 * entender de qué va esto, y para qué país, es la consecuencia de responderlas
 * bien. Va en HTML plano, sin JavaScript, para que el rastreador lo lea entero.
 */
export default function ContenidoSeo() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14">
      <div className="tarjeta p-6 sm:p-8">
        <h2 className="titulo">Cómo recargar diamantes de Free Fire en Ecuador</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-tenue">
          En FFPINS vendemos <strong className="text-fuerte">pines de diamantes</strong> para Free
          Fire: códigos que canjeas tú mismo en el centro de canje oficial del juego. Pagas en
          dólares por transferencia desde tu banco en Ecuador y recibes el código al instante.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Paso n={1} Icono={Landmark} titulo="Recarga tu saldo">
            Transfieres a nuestra cuenta de <strong className="text-fuerte">Banco Guayaquil</strong> o{' '}
            <strong className="text-fuerte">Banco Pichincha</strong> y subes el comprobante. Desde $2.
          </Paso>
          <Paso n={2} Icono={Wallet} titulo="Verificamos y acreditamos">
            Revisamos la transferencia a mano y te acreditamos el saldo. Te avisamos por
            correo y en la web.
          </Paso>
          <Paso n={3} Icono={Zap} titulo="Compras y canjeas">
            Eliges el pin, se descuenta de tu saldo y el código aparece al instante. Lo canjeas
            cuando quieras.
          </Paso>
        </div>
      </div>

      <div className="tarjeta mt-4 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
        <ShieldCheck size={30} strokeWidth={1.5} className="shrink-0 text-ok" />
        <div>
          <h2 className="subtitulo">Nunca te pedimos tu ID ni tu contraseña</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-tenue">
            Muchas tiendas recargan «por ID»: les entregas los datos de tu cuenta de Free Fire y
            recargan por ti. Aquí no hace falta. Te damos el{' '}
            <strong className="text-fuerte">código de canje</strong> y lo ingresas tú en el sitio
            oficial de Garena. Tu cuenta no pasa por manos de nadie.
          </p>
        </div>
      </div>

      <h2 className="titulo mt-10">Preguntas frecuentes</h2>
      <div className="mt-4 space-y-3">
        {PREGUNTAS.map(({ p, r }) => (
          <details key={p} className="tarjeta group p-4 transition-all hover:border-marca/40 open:border-marca/50 sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-fuerte">
              <div className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-marca/12 text-xs font-bold text-marca">
                  ?
                </span>
                <h3 className="text-sm font-semibold text-fuerte transition-colors group-hover:text-marca sm:text-base">
                  {p}
                </h3>
              </div>
              <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-panel2 text-sm font-bold text-marca transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 border-t border-linea/60 pt-3 text-xs leading-relaxed text-tenue sm:pl-9 sm:text-sm">
              {r}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-tenue">
        ¿Listo para empezar?{' '}
        <Link href="/registro" className="font-medium text-marca hover:underline">
          Crea tu cuenta gratis
        </Link>{' '}
        y recarga desde $2.
      </p>
    </section>
  )
}

function Paso({ n, Icono, titulo, children }: {
  n: number; Icono: typeof Wallet; titulo: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-linea bg-panel2 p-4">
      <div className="flex items-center gap-2.5">
        <span className="cifra grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-marca text-sm font-semibold text-sobre-marca">
          {n}
        </span>
        <Icono size={16} className="text-tenue" />
      </div>
      <h3 className="mt-2.5 text-sm font-semibold text-fuerte">{titulo}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-tenue">{children}</p>
    </div>
  )
}
