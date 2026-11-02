const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { NextRequest } = require('next/server')
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server')

const root = path.resolve(__dirname, '..')
const origin = 'https://tienda.example'

function fixture(mode) {
  const calls = { createClient: 0, getUser: 0 }
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
  }
  if (mode !== undefined) env.MAINTENANCE_MODE = mode
  const modules = new Map()

  function load(file) {
    if (modules.has(file)) return modules.get(file)
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    } }).outputText
    const module = { exports: {} }
    modules.set(file, module.exports)
    vm.runInNewContext(code, {
      module, exports: module.exports, process: { env },
      URL, Headers, Request, Response, console,
      require(name) {
        if (name === '@supabase/ssr') return {
          createServerClient() {
            calls.createClient += 1
            assert.equal(mode, 'false', 'El cierre debe ocurrir antes de crear el cliente Supabase')
            return { auth: { getUser: async () => {
              calls.getUser += 1
              return { data: { user: null } }
            } } }
          },
        }
        if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
        return require(name)
      },
    }, { filename: file })
    return module.exports
  }

  const { middleware, config } = load('src/middleware.ts')
  return {
    calls, config,
    request: (pathname, init) => middleware(new NextRequest(`${origin}${pathname}`, init)),
  }
}

function assertTemporary(response) {
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('retry-after'), '3600')
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.equal(response.headers.get('location'), null)
  assert.equal(response.headers.get('x-middleware-next'), null)
  assert.equal(response.headers.get('set-cookie'), null)
}

test('todas las rutas pasan por el middleware, incluidas API, assets y extensiones', () => {
  const { config } = fixture()
  for (const pathname of [
    '/', '/admin', '/admin/productos', '/login', '/registro', '/carrito',
    '/mis-compras/123', '/recuperar/token', '/auth/callback?code=falso',
    '/api', '/api/asistente', '/api/recarga/comprar', '/api/recarga/ejecutar',
    '/ruta/desconocida.png', '/admin/x.png', '/robots.txt', '/sitemap.xml',
    '/_next/static/test.js', '/_next/image?url=%2Flogo.png&w=64&q=75',
    '/logo-claro.png', '/favicon.ico',
  ]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `${origin}${pathname}` }), true, pathname)
  }
})

test('el cierre predeterminado sustituye todas las páginas antes de leer la sesión', async () => {
  const f = fixture()
  for (const pathname of [
    '/', '/admin', '/admin/productos', '/admin/usuarios/123', '/carrito',
    '/billetera', '/recargar', '/mis-compras/123', '/cuenta', '/ganancias',
    '/completar-perfil', '/login', '/registro', '/recuperar/token',
    '/auth/callback?code=falso', '/legal/terminos', '/legal/privacidad', '/baja?t=falso',
    '/ruta/desconocida', '/admin/x.png', '/api.png', '/robots.txt', '/sitemap.xml',
    '/_next/static/test.js', '/logo.png', '/mascota/neutral.png',
  ]) {
    const response = await f.request(pathname)
    assertTemporary(response)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.match(await response.text(), /Nos vemos pronto/)
  }
  assert.deepEqual(f.calls, { createClient: 0, getUser: 0 })
})

test('API devuelve un error temporal también con GET y rutas anidadas', async () => {
  const f = fixture()
  for (const pathname of ['/api', '/api/asistente', '/api/recarga/comprar', '/api/recarga/ejecutar', '/api/desconocida.png']) {
    const response = await f.request(pathname)
    assertTemporary(response)
    assert.match(response.headers.get('content-type'), /application\/json/)
    assert.match(JSON.stringify(await response.json()), /Nos vemos pronto/)
  }
  assert.equal(f.calls.createClient, 0)
})

test('ningún método de escritura ejecuta el sistema, ni siquiera en los assets permitidos', async () => {
  const f = fixture()
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    for (const pathname of ['/', '/admin/productos', '/auth/callback', '/api/asistente', '/api/recarga/comprar', '/logo-claro.png']) {
      const response = await f.request(pathname, { method })
      assertTemporary(response)
      assert.match(response.headers.get('content-type'), /application\/json/)
      assert.match(JSON.stringify(await response.json()), /Nos vemos pronto/)
    }
  }
  assert.equal(f.calls.createClient, 0)
})

test('una Server Action antigua se detiene antes de llegar al servidor', async () => {
  const f = fixture()
  for (const method of ['GET', 'POST']) {
    const response = await f.request('/admin/productos', { method, headers: { 'Next-Action': 'accion-antigua' } })
    assertTemporary(response)
    assert.match(response.headers.get('content-type'), /application\/json/)
  }
  assert.equal(f.calls.createClient, 0)
})

test('HEAD mantiene el estado temporal sin cuerpo', async () => {
  const f = fixture()
  for (const pathname of ['/', '/admin', '/api/asistente']) {
    const response = await f.request(pathname, { method: 'HEAD' })
    assertTemporary(response)
    assert.equal(await response.text(), '')
  }
})

test('solo los recursos concretos de la pantalla pasan sin consultar sesión', async () => {
  const f = fixture()
  for (const pathname of ['/logo-claro.png', '/logo-oscuro.png', '/mascota/saluda.png', '/favicon.ico']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await f.request(pathname, { method })
      assert.equal(response.headers.get('x-middleware-next'), '1')
      assert.equal(response.status, 200)
    }
  }
  assert.equal(f.calls.createClient, 0)
})

test('el cierre requiere false explícito para desactivarse', async () => {
  for (const mode of ['true', '', '0', 'FALSE']) {
    const f = fixture(mode)
    assertTemporary(await f.request('/'))
    assert.equal(f.calls.createClient, 0)
  }
})

test('al reabrir se restablecen la sesión y la protección de rutas privadas', async () => {
  const f = fixture('false')
  const publicResponse = await f.request('/login')
  assert.equal(publicResponse.headers.get('x-middleware-next'), '1')
  const privateResponse = await f.request('/admin/productos')
  assert.equal(privateResponse.status, 307)
  const redirect = new URL(privateResponse.headers.get('location'))
  assert.equal(redirect.pathname, '/login')
  assert.equal(redirect.searchParams.get('volver'), '/admin/productos')
  assert.deepEqual(f.calls, { createClient: 2, getUser: 2 })
})

test('al reabrir los estáticos siguen sin refrescar la sesión', async () => {
  const f = fixture('false')
  for (const pathname of ['/logo.png', '/favicon.ico', '/_next/static/test.js', '/_next/image?url=%2Flogo.png&w=64&q=75']) {
    const response = await f.request(pathname)
    assert.equal(response.headers.get('x-middleware-next'), '1')
  }
  assert.equal(f.calls.createClient, 0)
})
