import { NextResponse, type NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { soloFecha } from '@/lib/format'
import {
  instrucciones, responderBasico, type Contexto, type Entrada, type Modo,
} from '@/lib/asistente'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Asistente del cliente.
 *
 * La clave del proveedor vive solo aquí: el navegador nunca la ve. Todo lo que
 * el modelo llega a saber se arma en este archivo, consultando la base con la
 * sesión del propio cliente, así que RLS decide qué datos existen para él. Los
 * datos de otro cliente no es que estén prohibidos por el prompt: es que nunca
 * salen de la base.
 */

const API = 'https://api.groq.com/openai/v1/chat/completions'
const MODELO = process.env.IA_MODELO ?? 'openai/gpt-oss-120b'
const MAX_PREGUNTA = 500
const HISTORIAL = 8

/**
 * Cuándo volver a intentar con el modelo, en milisegundos de reloj.
 *
 * Vive en memoria del proceso a propósito: si estuviera en la base, cualquier
 * cliente podría escribir ahí y apagarle el asistente a todos. Cada instancia
 * del servidor aprende por su cuenta cuándo el proveedor le cortó el cupo.
 */
let pausadoHasta = 0

function pausar(segundos: number) {
  pausadoHasta = Math.max(pausadoHasta, Date.now() + segundos * 1000)
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para usar el asistente.' }, { status: 401 })

  const cuerpo = await req.json().catch(() => null)
  const pregunta = String((cuerpo as { pregunta?: unknown } | null)?.pregunta ?? '').trim()

  if (!pregunta) return NextResponse.json({ error: 'Escribe tu pregunta.' }, { status: 400 })
  if (pregunta.length > MAX_PREGUNTA) {
    return NextResponse.json({ error: 'Esa pregunta es muy larga. Resúmela un poco.' }, { status: 400 })
  }

  // Tope diario por cliente: sin esto, una sola persona agota el cupo gratuito
  // del día para toda la tienda.
  const { data: cuota } = await sb.rpc('fn_asistente_cuota')
  const { limite, usados } = (cuota as { limite: number; usados: number } | null) ?? { limite: 30, usados: 0 }
  if (usados >= limite) {
    return NextResponse.json({
      error: `Llegaste a las ${limite} preguntas de hoy. Mañana se renueva, y para algo urgente escríbenos por WhatsApp.`,
    }, { status: 429 })
  }

  const contexto = await armarContexto(sb, user.id)
  const historial = await ultimosMensajes(sb, user.id)

  await sb.from('assistant_messages').insert({ user_id: user.id, rol: 'CLIENTE', texto: pregunta })

  // Modo IA mientras el proveedor conteste; si nos cortó el cupo hace un
  // momento, ni lo intentamos y vamos derecho al respaldo.
  const espera = pausadoHasta > Date.now() ? Math.ceil((pausadoHasta - Date.now()) / 60000) : null

  if (espera === null && process.env.GROQ_API_KEY) {
    const flujo = await pedirAlModelo(pregunta, contexto, historial)
    if (flujo) return respuestaEnVivo(flujo, sb, user.id)
  }

  const { texto, resuelta } = responderBasico(pregunta, contexto)
  await guardar(sb, user.id, texto, 'BASICO', !resuelta)

  return new NextResponse(texto, {
    headers: cabeceras('BASICO', pausadoHasta > Date.now()
      ? Math.ceil((pausadoHasta - Date.now()) / 60000)
      : null),
  })
}

const cabeceras = (modo: Modo, minutos: number | null) => ({
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Modo': modo,
  ...(minutos !== null ? { 'X-Reintento-Min': String(minutos) } : {}),
})

/* ─────────────────────────── Contexto ─────────────────────────── */

type Cliente = Awaited<ReturnType<typeof supabaseServer>>

/**
 * Lo único que el modelo llega a ver. Se le da el primer nombre y no el
 * completo, y jamás el correo ni el teléfono: para responder no hacen falta.
 */
async function armarContexto(sb: Cliente, uid: string): Promise<Contexto> {
  const [perfil, wallet, productos, compras, recargas, kb, contacto] = await Promise.all([
    sb.from('profiles').select('nombre').eq('id', uid).single(),
    sb.from('wallets').select('balance_cents').eq('user_id', uid).single(),
    sb.from('products').select('nombre, diamantes, precio_cents, stock_disponible')
      .eq('activo', true).order('orden'),
    sb.from('orders').select('created_at, order_items(products(nombre))')
      .order('created_at', { ascending: false }).limit(3),
    sb.from('topup_requests').select('id', { count: 'exact', head: true }).eq('estado', 'PENDIENTE'),
    sb.from('assistant_kb').select('pregunta, respuesta, claves').eq('activo', true).order('orden'),
    sb.from('app_settings').select('value').eq('key', 'contacto').single(),
  ])

  const wa = (contacto.data as { value: { whatsapp?: string } } | null)?.value?.whatsapp ?? ''

  type Pedido = { created_at: string; order_items: { products: { nombre: string } | null }[] }

  return {
    nombre: ((perfil.data as { nombre: string } | null)?.nombre ?? '').split(' ')[0],
    saldo_cents: (wallet.data as { balance_cents: number } | null)?.balance_cents ?? 0,
    productos: ((productos.data as {
      nombre: string; diamantes: number; precio_cents: number; stock_disponible: number
    }[] | null) ?? []).map((p) => ({
      nombre: p.nombre, diamantes: p.diamantes, precio_cents: p.precio_cents, stock: p.stock_disponible,
    })),
    compras: ((compras.data as Pedido[] | null) ?? []).map((o) => ({
      fecha: soloFecha(o.created_at.slice(0, 10)),
      producto: o.order_items?.[0]?.products?.nombre ?? 'un paquete',
    })),
    recargas_pendientes: recargas.count ?? 0,
    kb: (kb.data as Entrada[] | null) ?? [],
    whatsapp: formatoWhatsapp(wa),
  }
}

/** 593967549140 se le enseña al cliente como 0967549140. */
const formatoWhatsapp = (n: string) =>
  n.startsWith('593') ? `0${n.slice(3)}` : n

async function ultimosMensajes(sb: Cliente, uid: string) {
  const { data } = await sb.from('assistant_messages')
    .select('rol, texto').eq('user_id', uid)
    .order('created_at', { ascending: false }).limit(HISTORIAL)

  const filas = ((data as { rol: string; texto: string }[] | null) ?? []).reverse()
  return filas.map((m) => ({
    role: m.rol === 'CLIENTE' ? ('user' as const) : ('assistant' as const),
    content: m.texto,
  }))
}

/* ─────────────────────────── Modo IA ─────────────────────────── */

/**
 * Pide la respuesta al proveedor. Devuelve el cuerpo en streaming, o null si
 * hay que caer al modo básico — y en ese caso ya dejó anotado cuánto esperar.
 */
async function pedirAlModelo(
  pregunta: string,
  contexto: Contexto,
  historial: { role: 'user' | 'assistant'; content: string }[],
): Promise<ReadableStream<Uint8Array> | null> {
  // Un modelo que tarda más de 20 s no sirve para un chat: mejor responder ya
  // con el modo básico que dejar al cliente mirando los puntitos.
  const corte = AbortSignal.timeout(20_000)

  try {
    const r = await fetch(API, {
      method: 'POST',
      signal: corte,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODELO,
        stream: true,
        temperature: 0.3,          // soporte: preferimos exacto antes que creativo
        max_completion_tokens: 500,
        // gpt-oss "piensa" antes de responder y ese texto también gasta cupo:
        // sin bajarlo, se comía el presupuesto y cortaba la respuesta a medias.
        // En `hidden` ni siquiera viaja hasta aquí.
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        messages: [
          { role: 'system', content: instrucciones(contexto) },
          ...historial,
          { role: 'user', content: pregunta },
        ],
      }),
    })

    if (r.status === 429) {
      // El proveedor dice cuándo volver; si no, esperamos un minuto.
      const s = Number(r.headers.get('retry-after')) || 60
      pausar(Math.min(s, 3600))
      return null
    }
    if (!r.ok || !r.body) {
      // 5xx o clave inválida: no insistimos en cada mensaje.
      pausar(r.status >= 500 ? 120 : 600)
      return null
    }
    return r.body
  } catch {
    pausar(120)          // se cayó la red o venció el tiempo
    return null
  }
}

/**
 * Convierte el SSE del proveedor en texto plano para el navegador, y al
 * terminar guarda la respuesta completa. El guardado va aquí y no antes porque
 * hasta que el flujo no acaba no existe la respuesta entera.
 */
function respuestaEnVivo(flujo: ReadableStream<Uint8Array>, sb: Cliente, uid: string) {
  const lector = flujo.getReader()
  const dec = new TextDecoder()
  const enc = new TextEncoder()
  let completo = ''
  let resto = ''

  const salida = new ReadableStream<Uint8Array>({
    async pull(control) {
      const { done, value } = await lector.read()

      if (done) {
        const texto = completo.trim()
        if (texto) await guardar(sb, uid, texto, 'IA', false)
        else control.enqueue(enc.encode('No pude responder esta vez. Vuelve a intentarlo en un momento.'))
        control.close()
        return
      }

      resto += dec.decode(value, { stream: true })
      const lineas = resto.split('\n')
      resto = lineas.pop() ?? ''          // la última puede venir cortada

      for (const linea of lineas) {
        if (!linea.startsWith('data:')) continue
        const dato = linea.slice(5).trim()
        if (!dato || dato === '[DONE]') continue

        try {
          const trozo = JSON.parse(dato) as { choices?: { delta?: { content?: string } }[] }
          const texto = trozo.choices?.[0]?.delta?.content
          if (texto) {
            completo += texto
            control.enqueue(enc.encode(texto))
          }
        } catch {
          // Un trozo suelto mal formado no puede tumbar toda la respuesta.
        }
      }
    },
    cancel() { void lector.cancel() },
  })

  return new NextResponse(salida, { headers: cabeceras('IA', null) })
}

async function guardar(sb: Cliente, uid: string, texto: string, modo: Modo, sinResolver: boolean) {
  await sb.from('assistant_messages').insert({
    user_id: uid, rol: 'ASISTENTE', texto, modo, sin_resolver: sinResolver,
  })
}
