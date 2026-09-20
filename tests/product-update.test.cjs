const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function fixture({ user = { id: 'admin' }, admin = true, saved = { data: { id: 'product' }, error: null } } = {}) {
  const paths = [], updates = []
  const sb = {
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async () => ({ data: admin, error: null }),
    from: () => ({ update: (patch) => {
      updates.push(patch)
      return { eq: () => ({ select: () => ({ single: async () => saved }) }) }
    } }),
  }
  const exports = {}
  const source = fs.readFileSync('src/app/admin/productos/actions.ts', 'utf8')
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    exports, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co' } },
    require: (name) => name === 'next/cache'
      ? { revalidatePath: (path) => paths.push(path) }
      : { supabaseServer: async () => sb },
  })
  return { update: exports.actualizarProducto, paths, updates }
}

test('confirma precio e invalida catálogo y panel', async () => {
  const f = fixture()
  assert.equal((await f.update('product', { precio_cents: 450 })).error, null)
  assert.equal(f.updates[0].precio_cents, 450)
  assert.deepEqual(f.paths, ['/', '/admin/productos', '/carrito'])
})
test('no anuncia éxito ni invalida caché si no se actualizó ninguna fila', async () => {
  const f = fixture({ saved: { data: null, error: { code: 'PGRST116' } } })
  assert.ok((await f.update('product', { precio_cents: 450 })).error)
  assert.equal(f.paths.length, 0)
})
test('rechaza sesiones ausentes y usuarios que no son administradores', async () => {
  for (const options of [{ user: null }, { admin: false }]) {
    const f = fixture(options)
    assert.ok((await f.update('product', { precio_cents: 450 })).error)
    assert.equal(f.updates.length, 0)
  }
})
test('valida precios e imágenes y permite quitar la imagen', async () => {
  const f = fixture()
  for (const patch of [{ precio_cents: -1 }, { precio_cents: 1.5 }, { imagen_url: 'https://otro.com/a.png' }, { activo: 'true' }])
    assert.ok((await f.update('product', patch)).error)
  assert.equal(f.updates.length, 0)
  assert.equal((await f.update('product', { imagen_url: 'https://test.supabase.co/storage/v1/object/public/productos/product/new.png' })).error, null)
  assert.equal((await f.update('product', { imagen_url: null })).error, null)
})
test('valida y guarda el título del producto', async () => {
  const f = fixture()
  assert.ok((await f.update('product', { nombre: '   ' })).error)
  assert.ok((await f.update('product', { nombre: 'x'.repeat(81) })).error)
  assert.equal((await f.update('product', { nombre: '  Paquete semanal  ' })).error, null)
  assert.equal(f.updates[0].nombre, 'PAQUETE SEMANAL')
})
