'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-client'
import { fecha } from '@/lib/format'
import { avisar, type TipoAviso } from '@/components/ui/AvisoJuego'

type Notif = {
  id: number; tipo: string; titulo: string; cuerpo: string | null
  url: string | null; leida: boolean; created_at: string
}

/**
 * Con qué cara sale el aviso. El tipo lo pone la base, pero no distingue una
 * recarga aprobada de una rechazada: eso se lee del título, que es donde la
 * base ya escribe el signo ("Recarga rechazada", "Se ajustó tu saldo: -").
 */
function estiloDe(n: Notif): TipoAviso {
  if (/rechaz|saldo: -/i.test(n.titulo)) return 'alerta'
  if (n.tipo === 'COMPRA') return 'compra'
  if (n.tipo === 'STOCK')  return 'stock'
  return 'premio'
}

export default function Campanita({ uid }: { uid: string }) {
  const sb = supabaseBrowser()
  const [lista, setLista] = useState<Notif[]>([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const caja = useRef<HTMLDivElement>(null)
  const sinLeer = lista.filter((n) => !n.leida).length

  useEffect(() => {
    void (async () => {
      const { data } = await sb.from('notifications')
        .select('id, tipo, titulo, cuerpo, url, leida, created_at')
        .order('id', { ascending: false })
        .limit(15)
      setLista((data as Notif[]) ?? [])
      setCargando(false)
    })()

    const canal = sb
      .channel(`notif:${uid}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (p: { new: Notif }) => {
          setLista((prev) => [p.new, ...prev].slice(0, 15))
          // Un aviso que llega mientras el usuario mira otra cosa se anuncia solo.
          avisar({
            tipo: estiloDe(p.new),
            titulo: p.new.titulo,
            cuerpo: p.new.cuerpo,
            url: p.new.url,
          })
        })
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [sb, uid])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  const alternar = async () => {
    const abriendo = !abierto
    setAbierto(abriendo)
    if (abriendo && sinLeer > 0) {
      const ids = lista.filter((n) => !n.leida).map((n) => n.id)
      setLista((prev) => prev.map((n) => ({ ...n, leida: true })))
      await sb.from('notifications').update({ leida: true }).in('id', ids)
    }
  }

  return (
    <div className="relative" ref={caja}>
      <button onClick={alternar} aria-label={`Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}`}
        className={`btn-icono relative ${sinLeer > 0 ? 'activo' : ''}`}>
        <Bell size={19} />
        {sinLeer > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-marca ring-2 ring-base" />
        )}
      </button>

      {abierto && (
        <div className="fixed left-1/2 top-14 z-50 max-h-[26rem] w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-xl border border-linea bg-panel shadow-2xl sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:translate-x-0">
          <p className="etiqueta border-b border-linea px-4 py-2.5">Notificaciones</p>

          {cargando ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-panel2" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-panel2" />
                </div>
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-tenue">
              <BellOff size={22} strokeWidth={1.5} />
              <p className="text-sm">Sin avisos por ahora</p>
            </div>
          ) : (
            lista.map((n) => {
              const contenido = (
                <>
                  <p className="text-sm font-medium">{n.titulo}</p>
                  {n.cuerpo && <p className="mt-0.5 text-xs leading-relaxed text-tenue">{n.cuerpo}</p>}
                  <p className="mt-1 text-[11px] text-tenue">{fecha(n.created_at)}</p>
                </>
              )
              return n.url ? (
                <Link key={n.id} href={n.url} onClick={() => setAbierto(false)}
                  className="block border-b border-linea px-4 py-3 transition last:border-0 hover:bg-panel2">
                  {contenido}
                </Link>
              ) : (
                <div key={n.id} className="border-b border-linea px-4 py-3 last:border-0">{contenido}</div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
