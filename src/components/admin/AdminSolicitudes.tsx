'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, ChevronDown, Phone, Mail, KeyRound, Users } from 'lucide-react'
import { usd, fecha } from '@/lib/format'
import ImagenProducto from '@/components/ImagenProducto'

export type SolicitudFila = {
  id: number
  created_at: string
  products: {
    id: string; nombre: string; diamantes: number
    precio_cents: number; stock_disponible: number; imagen_url: string | null
  } | null
  profiles: { nombre: string; email: string; telefono: string } | null
}

type Grupo = {
  producto: NonNullable<SolicitudFila['products']>
  gente: SolicitudFila[]
  ultima: string
}

export default function AdminSolicitudes({ solicitudes, error }: {
  solicitudes: SolicitudFila[]
  error: string | null
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState<string | null>(null)

  // Lo que importa es qué producto piden y cuántos: la lista suelta de filas
  // no dice nada. Se agrupa por producto y se ordena por demanda.
  const grupos = Object.values(
    solicitudes.reduce<Record<string, Grupo>>((acc, s) => {
      if (!s.products) return acc
      const id = s.products.id
      acc[id] ??= { producto: s.products, gente: [], ultima: s.created_at }
      acc[id].gente.push(s)
      if (s.created_at > acc[id].ultima) acc[id].ultima = s.created_at
      return acc
    }, {}),
  ).sort((a, b) => b.gente.length - a.gente.length)

  const total = solicitudes.length

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titulo">Solicitudes</h1>
          <p className="mt-0.5 text-xs text-tenue">
            Clientes esperando que repongas stock. Al cargar los códigos se les
            avisa solo y la solicitud se cierra.
          </p>
        </div>
        {total > 0 && (
          <span className="chip bg-marca/12 text-marca">
            <Users size={12} /> {total} en espera
          </span>
        )}
      </div>

      {error && (
        <p className="tarjeta mb-3 border-error/40 bg-error/8 p-3.5 text-sm text-error">{error}</p>
      )}

      {grupos.length === 0 ? (
        <div className="tarjeta flex flex-col items-center gap-2.5 px-6 py-14 text-center">
          <Inbox size={24} strokeWidth={1.5} className="text-tenue" />
          <p className="text-sm text-tenue">Nadie está esperando stock por ahora</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {grupos.map(({ producto, gente, ultima }) => {
            const desplegado = abierto === producto.id
            const conStock = producto.stock_disponible > 0

            return (
              <div key={producto.id} className="tarjeta overflow-hidden">
                <button
                  onClick={() => setAbierto(desplegado ? null : producto.id)}
                  className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-panel2"
                >
                  <ImagenProducto url={producto.imagen_url} alt={producto.nombre}
                    sizes="56px" className="h-14 w-11 shrink-0 rounded-lg" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{producto.nombre}</p>
                    <p className="cifra text-xs text-tenue">
                      {usd(producto.precio_cents)} · último pedido {fecha(ultima)}
                    </p>
                    <p className="mt-1 text-[11px]">
                      {conStock ? (
                        <span className="text-ok">Ya tiene {producto.stock_disponible} en stock</span>
                      ) : (
                        <span className="text-error">Sin stock</span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="cifra text-xl font-semibold text-marca">{gente.length}</p>
                    <p className="text-[10px] text-tenue">
                      {gente.length === 1 ? 'persona' : 'personas'}
                    </p>
                  </div>

                  <ChevronDown size={16}
                    className={`shrink-0 text-tenue transition ${desplegado ? 'rotate-180' : ''}`} />
                </button>

                {desplegado && (
                  <div className="border-t border-linea">
                    {gente.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-linea px-3.5 py-2.5 text-xs last:border-0">
                        <span className="font-medium">{s.profiles?.nombre ?? 'Cliente'}</span>
                        {s.profiles?.telefono && s.profiles.telefono !== '0000000000' && (
                          <a href={`https://wa.me/593${s.profiles.telefono.replace(/^0|^\+593/, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="enlace text-xs hover:text-ok">
                            <Phone size={11} /> {s.profiles.telefono}
                          </a>
                        )}
                        <span className="inline-flex items-center gap-1 text-tenue">
                          <Mail size={11} /> {s.profiles?.email}
                        </span>
                        <span className="ml-auto text-tenue/60">{fecha(s.created_at)}</span>
                      </div>
                    ))}

                    <div className="p-3">
                      <Link href="/admin/codigos" className="btn btn-primario w-full sm:w-auto">
                        <KeyRound size={15} /> Cargar pines de {producto.nombre}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button onClick={() => router.refresh()} className="btn btn-suave mt-3 w-full sm:w-auto">
        Actualizar
      </button>
    </>
  )
}
