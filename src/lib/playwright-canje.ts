import { chromium, type Page } from 'playwright-core'

const BROWSERLESS_URL = process.env.BROWSERLESS_URL ?? ''
const WIDGET_URL = 'https://redeem.hype.games/widget/'

/** Tiempo máximo para todo el proceso de canje (ms). */
const TIMEOUT_TOTAL = 60_000
/** Tiempo máximo para cada paso individual (ms). */
const TIMEOUT_PASO = 15_000

type ResultadoCanje = {
  exito: boolean
  nombreJugador: string | null
  error: string | null
}

/**
 * Ejecuta el canje automático en redeem.hype.games usando Playwright
 * conectado a Browserless.io (o cualquier servicio compatible con CDP).
 *
 * Flujo:
 * 1. Abre el widget
 * 2. Ingresa el PIN
 * 3. Espera la pantalla de ID del jugador
 * 4. Ingresa el ID
 * 5. Acepta términos y condiciones
 * 6. Valida el ID (obtiene nombre del jugador)
 * 7. Confirma el canje
 * 8. Espera resultado
 */
export async function canjeAutomatico(params: {
  pin: string
  idJugador: string
}): Promise<ResultadoCanje> {
  const { pin, idJugador } = params

  if (!BROWSERLESS_URL) {
    throw new Error('BROWSERLESS_URL no está configurada. Agrega la variable de entorno.')
  }

  let browser
  try {
    // Conectar al servicio de browser remoto
    browser = await chromium.connectOverCDP(BROWSERLESS_URL, {
      timeout: TIMEOUT_PASO,
    })

    const context = browser.contexts()[0] ?? await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'es-EC',
    })

    const page = await context.newPage()
    page.setDefaultTimeout(TIMEOUT_PASO)

    // === PASO 1: Abrir el widget ===
    await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: TIMEOUT_PASO })

    // Esperar que el formulario de PIN esté listo
    await page.waitForSelector('#hpws-pin', { state: 'visible', timeout: TIMEOUT_PASO })

    // === PASO 2: Ingresar el PIN ===
    await page.fill('#hpws-pin', pin)

    // Pequeña pausa para simular comportamiento humano
    await page.waitForTimeout(randomDelay(300, 800))

    // Submit del formulario de PIN
    await page.click('#btn-validate')

    // === PASO 3: Esperar la pantalla de ID del jugador ===
    // El servidor responde con HTML nuevo que reemplaza el contenido
    // Esperamos que aparezca el formulario de redeem o un mensaje de error
    const resultado = await Promise.race([
      page.waitForSelector('#redeem-form', { state: 'visible', timeout: TIMEOUT_TOTAL })
        .then(() => 'formulario' as const),
      page.waitForSelector('.hpws-form-has-error', { state: 'visible', timeout: TIMEOUT_TOTAL })
        .then(() => 'error' as const),
    ])

    if (resultado === 'error') {
      const errorTexto = await page.textContent('.hpws-form-element__error')
      return {
        exito: false,
        nombreJugador: null,
        error: `PIN rechazado: ${errorTexto?.trim() || 'Error desconocido'}`,
      }
    }

    // === PASO 4: Ingresar el ID del jugador ===
    // El campo de ID puede tener diferentes selectores según la configuración del widget
    const inputId = page.locator('#redeem-form input[type="text"]').first()
    await inputId.waitFor({ state: 'visible', timeout: TIMEOUT_PASO })
    await inputId.fill(idJugador)

    // === PASO 5: Aceptar términos y condiciones ===
    const checkbox = page.locator('.privacy-policy-and-terms input[type="checkbox"], input[name="AcceptedTermsAndPolicy"]')
    if (await checkbox.count() > 0) {
      const yaChecked = await checkbox.first().isChecked()
      if (!yaChecked) {
        await checkbox.first().check()
      }
    }

    await page.waitForTimeout(randomDelay(200, 500))

    // === PASO 6: Validar ID (clic en "Verificar ID") ===
    // Buscar botón de verificar que no sea el de canjear final
    const btnVerificar = page.locator('#redeem-form button:not(.redeem):not(#btn-redeem)').first()
    if (await btnVerificar.count() > 0 && await btnVerificar.isEnabled()) {
      await btnVerificar.click()

      // Esperar que aparezca el nombre del jugador o un error
      await page.waitForTimeout(randomDelay(2000, 4000))
    }

    // === PASO 7: Obtener el nombre del jugador ===
    // El widget muestra el nombre del producto en <strong> también,
    // así que hay que filtrar para encontrar el nombre REAL del jugador.
    let nombreJugador: string | null = null

    // Palabras que indican que es un nombre de PRODUCTO, no de jugador
    const esProducto = (t: string) => {
      const lower = t.toLowerCase()
      return lower.includes('diamante') || lower.includes('free fire')
        || lower.includes('bonus') || lower.includes('recarga')
        || lower.includes('pin') || lower.includes('crédito')
        || lower.includes('credito') || lower.includes('verificar')
        || lower.includes('canjear') || lower.includes('resgatar')
        || lower.includes('confirmar') || lower.length > 40
    }

    // Buscar en diferentes selectores, iterando TODOS los elementos (no solo el primero)
    const selectoresNombre = [
      '.player-name',
      '.nickname',
      '.user-name',
      '#redeem-form .filled strong',
      '#redeem-form .filled b',
      '#redeem-form strong',
      '#redeem-form b',
      '.hpws-content strong',
    ]

    for (const selector of selectoresNombre) {
      if (nombreJugador) break
      const elems = page.locator(selector)
      const count = await elems.count()
      for (let idx = 0; idx < count; idx++) {
        const texto = await elems.nth(idx).textContent()
        const limpio = texto?.trim() ?? ''
        if (limpio.length >= 2 && limpio.length <= 30 && !esProducto(limpio)) {
          nombreJugador = limpio
          break
        }
      }
    }

    // === PASO 8: Confirmar el canje ===
    const btnCanjear = page.locator('#btn-redeem, .redeem, button:has-text("Canjear")')
    await btnCanjear.first().waitFor({ state: 'visible', timeout: TIMEOUT_PASO })

    await page.waitForTimeout(randomDelay(300, 700))
    await btnCanjear.first().click()

    // === PASO 9: Esperar resultado final ===
    const resultadoFinal = await esperarResultado(page)

    return {
      exito: resultadoFinal.exito,
      nombreJugador,
      error: resultadoFinal.error,
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error desconocido en automatización'
    return {
      exito: false,
      nombreJugador: null,
      error: mensaje,
    }
  } finally {
    if (browser) {
      try { await browser.close() } catch { /* silenciar error de cierre */ }
    }
  }
}

/**
 * Espera el resultado final del canje.
 * Busca indicadores de éxito o error en la página.
 */
async function esperarResultado(page: Page): Promise<{ exito: boolean; error: string | null }> {
  try {
    // Esperar cambios en el contenido (máximo 30 segundos)
    await page.waitForTimeout(3000)

    const contenido = await page.textContent('.hpws-content')
    const textoLimpio = (contenido ?? '').toLowerCase()

    // Indicadores de éxito
    const indicadoresExito = [
      'entrega de créditos en proceso',
      'entrega de creditos en processo',
      'créditos entregados',
      'redención exitosa',
      'resgate realizado',
      'successfully redeemed',
      'proceso completado',
    ]

    for (const indicador of indicadoresExito) {
      if (textoLimpio.includes(indicador)) {
        return { exito: true, error: null }
      }
    }

    // Indicadores de error
    const indicadoresError = [
      'pin inválido',
      'pin ya utilizado',
      'código no válido',
      'error interno',
      'já utilizado',
      'já resgatado',
      'already redeemed',
    ]

    for (const indicador of indicadoresError) {
      if (textoLimpio.includes(indicador)) {
        return { exito: false, error: `Canje rechazado: ${indicador}` }
      }
    }

    // Si hay un mensaje de error visible
    const errorElem = page.locator('.hpws-form-has-error .hpws-form-element__error')
    if (await errorElem.count() > 0) {
      const errorTexto = await errorElem.first().textContent()
      if (errorTexto?.trim()) {
        return { exito: false, error: errorTexto.trim() }
      }
    }

    // Si llegamos hasta aquí y la página cambió, asumir éxito
    // (el contenido fue reemplazado por HTML de resultado)
    if (textoLimpio.includes('proceso') || textoLimpio.includes('process')) {
      return { exito: true, error: null }
    }

    return { exito: false, error: 'No se pudo determinar el resultado del canje.' }
  } catch {
    return { exito: false, error: 'Timeout esperando resultado del canje.' }
  }
}

/** Delay aleatorio para simular comportamiento humano. */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
