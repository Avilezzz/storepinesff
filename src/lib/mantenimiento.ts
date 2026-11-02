import { NextResponse, type NextRequest } from 'next/server'

// El cierre queda activo por defecto, también en despliegues sin variables nuevas.
// Para reabrir: MAINTENANCE_MODE=false y volver a desplegar/reiniciar el servidor.
const RECURSOS = new Set([
  '/logo-claro.png',
  '/logo-oscuro.png',
  '/mascota/saluda.png',
  '/favicon.ico',
])

const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Retry-After': '3600',
}

// Documento autónomo: no monta la tienda, sus proveedores ni conexiones a datos.
// No necesita JavaScript, fuentes externas o el renderizado de las rutas de Next.
const PANTALLA = `<!doctype html>
<html lang="es-EC">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <meta name="theme-color" content="#090b0f">
    <meta name="description" content="FFPINS está en pausa por un tiempo. Nos vemos pronto.">
    <title>Nos vemos pronto | FFPINS</title>
    <link rel="icon" href="/favicon.ico">
    <style>
      :root { color-scheme: dark; --fondo: #090b0f; --texto: #f8fafc; --tenue: #a6b3c6; --acento: #38bdf8; --linea: #242938; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--fondo); color: var(--texto); font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
      .pantalla { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; padding: 32px clamp(24px, 6vw, 88px); }
      header { display: flex; align-items: center; }
      .logo { display: block; width: auto; height: 32px; }
      .logo-claro { display: none; }
      main { width: 100%; max-width: 920px; margin: auto; padding: 48px 0; display: grid; grid-template-columns: 1fr 240px; align-items: center; gap: 64px; }
      .estado { margin: 0 0 20px; font-size: 13px; font-weight: 600; color: var(--acento); letter-spacing: .08em; text-transform: uppercase; }
      h1 { max-width: 600px; margin: 0; font-size: clamp(44px, 6.5vw, 80px); line-height: 1.04; letter-spacing: -.055em; font-weight: 650; text-wrap: balance; }
      .mensaje { max-width: 380px; margin: 28px 0 0; color: var(--tenue); font-size: 17px; line-height: 1.7; }
      .mascota { display: block; width: 100%; height: auto; border-radius: 24px; }
      footer { padding-top: 20px; border-top: 1px solid var(--linea); color: var(--tenue); font-size: 12px; }
      footer p { margin: 0; }
      @media (prefers-color-scheme: light) {
        :root { color-scheme: light; --fondo: #f6f7f9; --texto: #0b0f19; --tenue: #475467; --acento: #1d4ed8; --linea: #dbe0e8; }
        .logo-oscuro { display: none; }
        .logo-claro { display: block; }
      }
      @media (max-width: 640px) {
        .pantalla { padding: 24px; }
        .logo { height: 27px; }
        main { grid-template-columns: 1fr; gap: 28px; text-align: center; padding: 36px 0; }
        .mascota { grid-row: 1; width: 128px; margin: auto; border-radius: 16px; }
        h1 { max-width: 330px; margin: auto; }
        .estado { margin-bottom: 16px; font-size: 11px; }
        .mensaje { margin: 20px auto 0; font-size: 16px; }
        footer { text-align: center; }
      }
    </style>
  </head>
  <body>
    <div class="pantalla">
      <header aria-label="FFPINS">
        <img class="logo logo-oscuro" src="/logo-oscuro.png" alt="FFPINS" width="855" height="240">
        <img class="logo logo-claro" src="/logo-claro.png" alt="FFPINS" width="937" height="240">
      </header>
      <main>
        <div>
          <p class="estado">Estamos en pausa</p>
          <h1>Nos vemos pronto</h1>
          <p class="mensaje">Hacemos una pausa por un tiempo. Gracias por acompañarnos, nos encontraremos de nuevo muy pronto.</p>
        </div>
        <img class="mascota" src="/mascota/saluda.png" alt="" width="202" height="255" fetchpriority="high">
      </main>
      <footer><p>FFPINS · Hasta pronto.</p></footer>
    </div>
  </body>
</html>`

export function respuestaMantenimiento(req: NextRequest): NextResponse | null {
  if (process.env.MAINTENANCE_MODE === 'false') return null

  const path = req.nextUrl.pathname
  const lectura = req.method === 'GET' || req.method === 'HEAD'
  const operacion = !lectura || req.headers.has('next-action')

  // Excepciones exactas, solo para dibujar el aviso. Nunca se excluyen todas
  // las URLs con extensión de imagen: una ruta dinámica podría tenerla.
  if (!operacion && RECURSOS.has(path)) return NextResponse.next()

  if (operacion || path === '/api' || path.startsWith('/api/')) {
    return new NextResponse(req.method === 'HEAD' ? null : JSON.stringify({
      error: 'Nos vemos pronto. El sitio está temporalmente en pausa.',
      code: 'MAINTENANCE_MODE',
    }), {
      status: 503,
      headers: { ...HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  return new NextResponse(req.method === 'HEAD' ? null : PANTALLA, {
    status: 503,
    headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
  })
}
