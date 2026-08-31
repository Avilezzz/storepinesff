/**
 * Canje automático de pines en redeem.hype.games usando la API /function de Browserless.io.
 * Al usar la API HTTP REST de Browserless:
 * 1. NO se necesitan dependencias pesadas de navegador en Vercel (cero riesgo de error 500 por binarios faltantes).
 * 2. Toda la automatización con Chrome/Puppeteer corre 100% en la nube de Browserless.
 */

type ResultadoCanje = {
  exito: boolean
  nombreJugador: string | null
  error: string | null
}

function getBrowserlessToken(): string {
  const envVal = process.env.BROWSERLESS_URL || ''
  if (!envVal) return ''
  if (envVal.includes('token=')) {
    const after = envVal.split('token=')[1]
    return after.split('&')[0].trim()
  }
  return envVal.trim()
}

/**
 * Código JavaScript que se envía a Browserless para ejecutarse dentro de su navegador Chrome.
 */
const BROWSERLESS_SCRIPT = `
export default async ({ page, context }) => {
  const { pin, idJugador } = context;
  const WIDGET_URL = 'https://redeem.hype.games/widget/';

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Abrir el widget
    await page.goto(WIDGET_URL, { waitUntil: 'networkidle2', timeout: 20000 });

    // 2. Ingresar el PIN
    await page.waitForSelector('#hpws-pin', { visible: true, timeout: 15000 });
    await page.type('#hpws-pin', pin, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Validar PIN
    await page.click('#btn-validate');

    // 3. Esperar pantalla de ID del jugador o error
    await page.waitForFunction(
      () => document.querySelector('#redeem-form') !== null || document.querySelector('.hpws-form-has-error') !== null,
      { timeout: 25000 }
    );

    // Verificar si el PIN dio error
    const tieneError = await page.evaluate(() => {
      const err = document.querySelector('.hpws-form-has-error .hpws-form-element__error');
      return err && err.innerText.trim().length > 0 ? err.innerText.trim() : null;
    });

    if (tieneError) {
      return {
        data: { exito: false, nombreJugador: null, error: 'PIN rechazado: ' + tieneError },
        type: 'application/json'
      };
    }

    // 4. Ingresar ID del jugador
    await page.waitForSelector('#redeem-form input[type="text"]', { visible: true, timeout: 15000 });
    await page.type('#redeem-form input[type="text"]', idJugador, { delay: 40 });

    // 5. Aceptar términos si existen
    const checkbox = await page.$('.privacy-policy-and-terms input[type="checkbox"], input[name="AcceptedTermsAndPolicy"]');
    if (checkbox) {
      const isChecked = await page.evaluate(el => el.checked, checkbox);
      if (!isChecked) {
        await checkbox.click();
      }
    }

    await new Promise(r => setTimeout(r, 400));

    // 6. Verificar ID para cargar el nickname
    const btnVerificar = await page.$('#redeem-form button:not(.redeem):not(#btn-redeem)');
    if (btnVerificar) {
      await btnVerificar.click();
      await new Promise(r => setTimeout(r, 3000));
    }

    // 7. Extraer nombre real del jugador (filtrando nombres de productos)
    const nombreJugador = await page.evaluate(() => {
      const esProducto = (t) => {
        const lower = t.toLowerCase();
        return lower.includes('diamante') || lower.includes('free fire') || lower.includes('bonus')
          || lower.includes('recarga') || lower.includes('pin') || lower.includes('crédito')
          || lower.includes('credito') || lower.includes('verificar') || lower.includes('canjear')
          || lower.includes('resgatar') || lower.includes('confirmar') || lower.length > 40;
      };

      const selectores = [
        '.player-name', '.nickname', '.user-name',
        '#redeem-form .filled strong', '#redeem-form .filled b',
        '#redeem-form strong', '#redeem-form b', '.hpws-content strong'
      ];

      for (const s of selectores) {
        const els = document.querySelectorAll(s);
        for (const el of els) {
          const txt = (el.innerText || '').trim();
          if (txt.length >= 2 && txt.length <= 30 && !esProducto(txt)) {
            return txt;
          }
        }
      }
      return null;
    });

    // 8. Confirmar canje
    const btnCanjear = await page.$('#btn-redeem, .redeem, button[type="submit"]');
    if (btnCanjear) {
      await btnCanjear.click();
    }

    // 9. Esperar resultado final
    await new Promise(r => setTimeout(r, 4000));

    const resultadoFinal = await page.evaluate(() => {
      const text = (document.querySelector('.hpws-content')?.innerText || '').toLowerCase();
      const exitoFrases = [
        'entrega de créditos en proceso', 'entrega de creditos en processo',
        'créditos entregados', 'redención exitosa', 'resgate realizado',
        'successfully redeemed', 'proceso completado'
      ];

      for (const ok of exitoFrases) {
        if (text.includes(ok)) return { exito: true, error: null };
      }

      const errFrases = [
        'pin inválido', 'pin ya utilizado', 'código no válido', 'error interno',
        'já utilizado', 'já resgatado', 'already redeemed'
      ];

      for (const err of errFrases) {
        if (text.includes(err)) return { exito: false, error: 'Canje rechazado: ' + err };
      }

      const errElem = document.querySelector('.hpws-form-has-error .hpws-form-element__error');
      if (errElem && errElem.innerText.trim()) {
        return { exito: false, error: errElem.innerText.trim() };
      }

      if (text.includes('proceso') || text.includes('process')) {
        return { exito: true, error: null };
      }

      return { exito: false, error: 'No se pudo determinar el resultado del canje.' };
    });

    return {
      data: {
        exito: resultadoFinal.exito,
        nombreJugador: nombreJugador,
        error: resultadoFinal.error
      },
      type: 'application/json'
    };
  } catch (err) {
    return {
      data: {
        exito: false,
        nombreJugador: null,
        error: err && err.message ? err.message : 'Error en automatización'
      },
      type: 'application/json'
    };
  }
};
`

export async function canjeAutomatico(params: {
  pin: string
  idJugador: string
}): Promise<ResultadoCanje> {
  const { pin, idJugador } = params
  const token = getBrowserlessToken()

  if (!token) {
    throw new Error('BROWSERLESS_URL no está configurada o no tiene token válido.')
  }

  try {
    const endpoint = `https://chrome.browserless.io/function?token=${encodeURIComponent(token)}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: BROWSERLESS_SCRIPT,
        context: {
          pin,
          idJugador,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Browserless API Error]:', response.status, errorText)
      return {
        exito: false,
        nombreJugador: null,
        error: `Error de conexión con servicio Browserless (${response.status}): ${errorText.slice(0, 100)}`,
      }
    }

    const json = await response.json()
    // Browserless /function devuelve el objeto que retornamos en data
    const resultado = json?.data || json

    return {
      exito: Boolean(resultado.exito),
      nombreJugador: resultado.nombreJugador ?? null,
      error: resultado.error ?? null,
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error de comunicación con Browserless'
    console.error('[canjeAutomatico]:', mensaje)
    return {
      exito: false,
      nombreJugador: null,
      error: mensaje,
    }
  }
}

