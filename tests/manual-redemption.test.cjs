const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
function load(file, mocks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => name in mocks ? mocks[name] : require(name),
    Set, console,
  }, { filename: file })
  return module.exports
}

function fixture(overrides = {}) {
  const queries = []
  const order = {
    id: 1, numero: 'TEST-1', estado: 'COMPLETADA', total_cents: 100,
    created_at: '2026-09-17', id_jugador: null, nombre_jugador: null,
    order_items: [{ id: 2, producto_nombre: 'Pin de prueba', cantidad: 1,
      precio_unit_cents: 100, subtotal_cents: 100, products: null }],
    ...overrides.order,
  }
  const results = {
    orders: { data: order },
    redemptions: { data: overrides.canjes ?? [] },
    pin_codes: { data: [{ id: 3, codigo: 'TEST-NOT-A-REAL-PIN', estado: 'VENDIDO', order_item_id: 2 }] },
    claims: { data: [] },
    app_settings: { data: { value: { url: 'https://example.com/', url_embed: 'https://example.com/embed' } } },
    ...overrides.results,
  }
  const sb = {
    auth: { getUser: async () => ({ data: { user: overrides.loggedOut ? null : { id: 'owner' } } }) },
    from(table) {
      queries.push([table])
      const query = { then(resolve, reject) { return Promise.resolve(results[table]).then(resolve, reject) } }
      for (const method of ['select', 'eq', 'in', 'order', 'maybeSingle']) {
        query[method] = (...args) => { queries.push([table, method, ...args]); return query }
      }
      return query
    },
  }
  const { default: Page } = load('src/app/mis-compras/[id]/page.tsx', {
    'next/link': ({ children }) => React.createElement('a', null, children),
    'next/navigation': { redirect: () => { throw Error('LOGIN') }, notFound: () => { throw Error('NOT_FOUND') } },
    '@/lib/supabase': { supabaseServer: async () => sb },
    '@/lib/format': { usd: String, fecha: String },
    '@/components/ImagenProducto': () => null,
    '@/components/PinesEntregados': ({ pines, urlEmbed }) => React.createElement('div', { 'data-embed': urlEmbed }, pines.map(p => p.codigo).join(',')),
  })
  return { queries, render: async () => renderToStaticMarkup(await Page({ params: Promise.resolve({ id: '1' }) })) }
}

test('compra manual entrega el PIN y la URL integrada solo al propietario', async () => {
  const f = fixture()
  const html = await f.render()
  assert.match(html, /TEST-NOT-A-REAL-PIN/)
  assert.match(html, /https:\/\/example.com\/embed/)
  assert.match(html, /canje manual/)
  assert.ok(f.queries.some(q => q[0] === 'orders' && q[1] === 'eq' && q[2] === 'user_id' && q[3] === 'owner'))
  assert.ok(f.queries.some(q => q[0] === 'pin_codes' && q[1] === 'in' && q[2] === 'estado' && q[3].join(',') === 'VENDIDO,DEFECTUOSO'))
})

test('una recarga automática anterior no expone códigos para volver a canjear', async () => {
  const f = fixture({ order: { estado: 'COMPLETADA', id_jugador: '123456' }, canjes: [{ id: 1, estado: 'EXITO', created_at: '2026-09-17' }] })
  assert.doesNotMatch(await f.render(), /TEST-NOT-A-REAL-PIN/)
  assert.ok(!f.queries.some(q => q[0] === 'pin_codes'))
})

test('sin PIN o con error anterior no se pide pagar otra vez', async () => {
  assert.match(await fixture({ results: { pin_codes: { data: [] } } }).render(), /No vuelvas a comprar/)
  assert.match(await fixture({ order: { estado: 'ERROR' } }).render(), /No vuelvas a pagar/)
})

test('fallos de lectura no se confunden con una compra sin pines', async () => {
  await assert.rejects(fixture({ results: { pin_codes: { data: null, error: { message: 'test' } } } }).render(), /No se pudieron cargar/)
  await assert.rejects(fixture({ results: { redemptions: { data: null, error: { message: 'test' } } } }).render(), /historial/)
})

test('sin sesión no se consulta la orden', async () => {
  const f = fixture({ loggedOut: true })
  await assert.rejects(f.render(), /LOGIN/)
  assert.equal(f.queries.length, 0)
})

for (const route of ['comprar', 'ejecutar']) {
  test(`ruta automática ${route} retirada sin cobrar ni reservar`, async () => {
    const { POST } = load(`src/app/api/recarga/${route}/route.ts`, {
      'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    })
    const response = await POST()
    assert.equal(response.status, 410)
    assert.equal(response.body.error, 'CANJE_MANUAL')
  })
}
