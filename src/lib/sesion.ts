'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-client'

export type Sesion = {
  uid: string | null
  nombre: string
  rol: 'CLIENTE' | 'ADMIN'
  saldo: number | null
  items: number
  cargando: boolean
}

const VACIA: Sesion = { uid: null, nombre: '', rol: 'CLIENTE', saldo: null, items: 0, cargando: true }

/**
 * Estado de sesión compartido por la barra superior y la barra inferior móvil.
 * Un único suscriptor por pestaña: ambos componentes leen del mismo store en
 * vez de abrir cada uno su propia conexión de Realtime.
 */
let estado: Sesion = VACIA
let iniciado = false
const oyentes = new Set<(s: Sesion) => void>()

// Guard SÍNCRONO. No puede vivir en `estado` porque cargar() es asíncrono:
// entre la llamada y el emit hay una ventana donde un segundo evento de auth
// volvía a entrar y trataba de suscribir el canal dos veces.
let uidActual: string | null = null
let canal: ReturnType<ReturnType<typeof supabaseBrowser>['channel']> | null = null

function emitir(parcial: Partial<Sesion>) {
  estado = { ...estado, ...parcial }
  oyentes.forEach((f) => f(estado))
}

export function refrescarCarrito() {
  window.dispatchEvent(new Event('carrito-cambio'))
}

function arrancar() {
  if (iniciado) return
  iniciado = true
  const sb = supabaseBrowser()

  const contarCarrito = async (uid: string) => {
    const { count } = await sb.from('cart_items')
      .select('*', { count: 'exact', head: true }).eq('user_id', uid)
    if (uid === uidActual) emitir({ items: count ?? 0 })
  }

  const suscribir = (uid: string) => {
    if (canal) { sb.removeChannel(canal); canal = null }
    canal = sb
      .channel(`sesion:${uid}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${uid}` },
        (p: { new: { balance_cents: number } }) => emitir({ saldo: p.new.balance_cents }))
      .subscribe()
  }

  const cargar = async (uid: string) => {
    try {
      const [p, w] = await Promise.all([
        sb.from('profiles').select('nombre, rol').eq('id', uid).single(),
        sb.from('wallets').select('balance_cents').eq('user_id', uid).single(),
      ])
      if (uid !== uidActual) return   // la sesión cambió mientras consultábamos

      const perfil = p.data as { nombre: string; rol: 'CLIENTE' | 'ADMIN' } | null
      const wallet = w.data as { balance_cents: number } | null
      emitir({
        nombre: perfil?.nombre ?? '',
        rol: perfil?.rol ?? 'CLIENTE',
        saldo: wallet?.balance_cents ?? 0,
      })
      void contarCarrito(uid)
    } catch {
      // Un fallo de red no puede dejar la interfaz congelada en el skeleton.
      emitir({ cargando: false })
    }
  }

  // onAuthStateChange emite INITIAL_SESSION nada más registrarse, leyendo la
  // sesión del almacenamiento local: resuelve sin tocar la red. Por eso ya no
  // se usa getUser() aquí, que sí va al servidor y dejaba el skeleton colgado
  // en conexiones lentas.
  sb.auth.onAuthStateChange((_e: string, s: { user?: { id: string } } | null) => {
    const uid = s?.user?.id ?? null
    if (uid === uidActual && estado.cargando === false) return
    uidActual = uid

    if (!uid) {
      if (canal) { sb.removeChannel(canal); canal = null }
      emitir({ ...VACIA, cargando: false })
      return
    }

    // La barra deja de esperar de inmediato; nombre y saldo se rellenan solos.
    emitir({ uid, cargando: false })

    // Llamar a la API de Supabase dentro del propio callback de auth puede
    // bloquear su cola interna: se sale del callback antes de consultar.
    setTimeout(() => {
      if (uid !== uidActual) return
      suscribir(uid)
      void cargar(uid)
    }, 0)
  })

  window.addEventListener('carrito-cambio', () => {
    if (uidActual) void contarCarrito(uidActual)
  })
}

export function useSesion(): Sesion {
  const [local, setLocal] = useState(estado)

  useEffect(() => {
    arrancar()
    oyentes.add(setLocal)
    setLocal(estado)
    return () => { oyentes.delete(setLocal) }
  }, [])

  return local
}
