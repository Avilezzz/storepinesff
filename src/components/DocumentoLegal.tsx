import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VERSION_LEGAL, type Seccion } from '@/lib/legal'
import { soloFecha } from '@/lib/format'

/** Presentación común de los textos legales; el contenido vive en lib/legal.ts */
export default function DocumentoLegal({ titulo, entrada, secciones }: {
  titulo: string; entrada: string; secciones: Seccion[]
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-9">
      <Link href="/" className="enlace"><ArrowLeft size={14} /> Volver a la tienda</Link>

      <h1 className="titulo mt-4">{titulo}</h1>
      <p className="mt-1 text-xs text-tenue">
        Última actualización: {soloFecha(VERSION_LEGAL)}
      </p>

      <p className="mt-4 text-sm leading-relaxed text-tenue">{entrada}</p>

      <div className="mt-6 space-y-7">
        {secciones.map((s, i) => (
          <section key={s.titulo}>
            <h2 className="subtitulo mb-2.5">
              <span className="cifra mr-1.5 text-tenue">{i + 1}.</span>{s.titulo}
            </h2>

            <div className="space-y-3">
              {s.parrafos.map((p, j) =>
                Array.isArray(p) ? (
                  <ul key={j} className="space-y-2 pl-1">
                    {p.map((x) => (
                      <li key={x} className="flex gap-2.5 text-sm leading-relaxed">
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-marca" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={j} className="text-sm leading-relaxed">{p}</p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
