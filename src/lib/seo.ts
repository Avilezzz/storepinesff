/**
 * Datos de posicionamiento de la tienda.
 *
 * Todo lo que Google necesita saber vive aquí para no repetirlo por las
 * páginas. La orientación es Ecuador: moneda, idioma regional y bancos locales
 * son las señales que separan a una tienda de aquí de una internacional
 * genérica, y son justo las que hacen que aparezcamos ante quien busca desde
 * Guayaquil o Quito.
 */

export const SITIO = 'https://storepinesff.store'
export const MARCA = 'FFPINS'
export const LOCALE = 'es_EC'
export const PAIS = 'EC'

/** Lo que de verdad escribe la gente en Google. Guían los textos, no se rellenan. */
export const CLAVES = [
  'recargas free fire ecuador',
  'diamantes free fire ecuador',
  'comprar diamantes free fire',
  'pines free fire ecuador',
  'recargar free fire con transferencia',
  'diamantes free fire baratos',
  'pin free fire guayaquil',
  'recarga free fire quito',
]

/**
 * Código que da Google Search Console para comprobar que el sitio es tuyo.
 * Es el método de "etiqueta HTML": se pega aquí el valor del content y Google
 * lo lee al visitar la portada. No es un secreto, solo demuestra la propiedad.
 * Vacío = no se emite ninguna etiqueta.
 */
export const VERIFICACION_GOOGLE = ''

export const DESCRIPCION =
  'Compra pines de diamantes para Free Fire en Ecuador. Pagas por transferencia a ' +
  'Banco Guayaquil o Pichincha y recibes tu código al instante, sin dar tu ID ni tu contraseña.'

/**
 * Ficha de la tienda para el buscador.
 * Sin reseñas ni valoraciones inventadas: marcar estrellas falsas es motivo de
 * penalización manual y además es mentir a quien todavía no te conoce.
 */
export function jsonLdTienda() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${SITIO}/#tienda`,
    name: MARCA,
    url: SITIO,
    logo: `${SITIO}/logo-claro.png`,
    image: `${SITIO}/og.png`,
    description: DESCRIPCION,
    priceRange: '$1 - $53',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Transferencia bancaria, Banco Guayaquil, Banco Pichincha',
    areaServed: { '@type': 'Country', name: 'Ecuador' },
    address: { '@type': 'PostalAddress', addressCountry: PAIS },
    sameAs: [] as string[],
  }
}

export function jsonLdSitio() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITIO}/#sitio`,
    url: SITIO,
    name: MARCA,
    inLanguage: 'es-EC',
    publisher: { '@id': `${SITIO}/#tienda` },
  }
}

type ProductoSeo = {
  slug: string; nombre: string; diamantes: number
  precio_cents: number; stock_disponible: number; imagen_url: string | null
}

/**
 * Cada pin como producto con su precio y disponibilidad reales. Es lo que
 * permite que Google muestre el precio directamente en el resultado, y el
 * stock sale de la base: si está agotado se declara agotado.
 */
export function jsonLdProductos(productos: ProductoSeo[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: productos.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: `${p.diamantes} Diamantes Free Fire`,
        description: `Pin de ${p.diamantes} diamantes para Free Fire. Código de canje con entrega inmediata en Ecuador.`,
        sku: p.slug,
        category: 'Videojuegos > Moneda virtual',
        brand: { '@type': 'Brand', name: 'Free Fire' },
        ...(p.imagen_url ? { image: p.imagen_url } : {}),
        offers: {
          '@type': 'Offer',
          url: `${SITIO}/#catalogo`,
          price: (p.precio_cents / 100).toFixed(2),
          priceCurrency: 'USD',
          availability: p.stock_disponible > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: { '@id': `${SITIO}/#tienda` },
          areaServed: { '@type': 'Country', name: 'Ecuador' },
        },
      },
    })),
  }
}

/** Las dudas reales de quien compra por primera vez. También se muestran en la página. */
export const PREGUNTAS = [
  {
    p: '¿Cómo recargo diamantes de Free Fire en Ecuador?',
    r: 'Creas tu cuenta, recargas saldo por transferencia a Banco Guayaquil o Banco Pichincha y subes el comprobante. Cuando verificamos la transferencia te acreditamos el saldo y ya puedes comprar el pin que quieras. El código aparece al instante en tu cuenta y te llega también por correo.',
  },
  {
    p: '¿Necesito dar mi ID de Free Fire o mi contraseña?',
    r: 'No. Aquí vendemos pines, que son códigos de canje: los ingresas tú mismo en el centro de canje oficial de Free Fire. Nunca te pedimos tu ID, tu correo del juego ni tu contraseña, así que tu cuenta no pasa por manos de nadie.',
  },
  {
    p: '¿Cuánto tarda en llegar el pin?',
    r: 'El pin es inmediato: en cuanto pagas con tu saldo, el código aparece en pantalla. Lo que puede tardar es la aprobación de la recarga de saldo, porque revisamos cada transferencia a mano, normalmente en minutos dentro del horario de atención.',
  },
  {
    p: '¿Con cuánto puedo empezar?',
    r: 'Desde 2 dólares. No hace falta recargar de más: puedes poner el monto justo del pin que quieres comprar.',
  },
  {
    p: '¿Qué formas de pago aceptan?',
    r: 'Transferencia o depósito a nuestras cuentas de Banco Guayaquil y Banco Pichincha, en dólares. No necesitas tarjeta de crédito.',
  },
  {
    p: '¿Y si el código no funciona?',
    r: 'Abres un reclamo desde tu compra y lo revisamos. Si el pin llegó defectuoso o ya usado, lo reponemos o te devolvemos el importe a tu saldo.',
  },
]

export function jsonLdPreguntas() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS.map(({ p, r }) => ({
      '@type': 'Question',
      name: p,
      acceptedAnswer: { '@type': 'Answer', text: r },
    })),
  }
}
