/**
 * Textos legales de la tienda.
 *
 * Van en un archivo de datos y no incrustados en las páginas para que se puedan
 * revisar de corrido, sin leer JSX. La VERSION es lo que se guarda en el perfil
 * al aceptar: si el texto cambia de forma relevante, se sube la fecha y se sabe
 * quién aceptó qué.
 *
 * Redactado siguiendo la Ley Orgánica de Protección de Datos Personales del
 * Ecuador (R.O. 459, 26-05-2021) y su Reglamento, más la Ley Orgánica de
 * Defensa del Consumidor. NO sustituye la revisión de un abogado.
 */

export const VERSION_LEGAL = '2026-08-21'
export const EDAD_MINIMA = 18

export const TIENDA = {
  nombre: 'FFPINS',
  sitio: 'storepinesff.store',
  correo: 'webiaec@gmail.com',
  pais: 'Ecuador',
}

export type Seccion = { titulo: string; parrafos: (string | string[])[] }

export const PRIVACIDAD: Seccion[] = [
  {
    titulo: 'Quién trata tus datos',
    parrafos: [
      `${TIENDA.nombre} (${TIENDA.sitio}) es responsable del tratamiento de los datos personales que nos entregas al usar la tienda. Operamos desde ${TIENDA.pais}.`,
      `Para cualquier asunto relacionado con tus datos personales, escríbenos a ${TIENDA.correo}. Respondemos a las solicitudes sobre tus derechos en un plazo máximo de 15 días hábiles, prorrogable por 10 días hábiles más en casos complejos, avisándote antes.`,
    ],
  },
  {
    titulo: 'Qué datos recogemos y para qué',
    parrafos: [
      'Solo pedimos lo que hace falta para que la tienda funcione. Estos son todos los datos que guardamos y el motivo de cada uno:',
      [
        'Nombre y apellido: para identificarte en tu cuenta y dirigirnos a ti.',
        'Correo electrónico: es la llave de tu cuenta y por donde te enviamos tus pines, el estado de tus recargas y avisos del servicio.',
        'Teléfono celular: para contactarte si hay un problema con una recarga o con un pin. Sin él no se puede comprar, porque es el único canal rápido que tenemos para resolver incidencias con dinero de por medio.',
        'Comprobante de transferencia, banco, número de referencia y fecha: para verificar que tu recarga es real antes de acreditarte el saldo.',
        'Historial de compras, saldo y movimientos de tu billetera: para llevar la cuenta de tu crédito y poder atender reclamos.',
        'Registro de los correos que te enviamos: para poder comprobar qué se te envió y cuándo si algo no te llega.',
      ],
      'No pedimos ni almacenamos números de tarjeta, claves bancarias ni datos de acceso a tu banco. La transferencia la haces tú, en tu propio banco, y nosotros solo vemos el comprobante que decides subir.',
      'No recogemos datos sensibles (salud, origen étnico, religión, orientación sexual, datos biométricos o similares). Si nos los envías por tu cuenta en un mensaje, los eliminaremos.',
    ],
  },
  {
    titulo: 'Con qué base legal los tratamos',
    parrafos: [
      'La LOPDP exige que todo tratamiento tenga una base que lo justifique. Estas son las nuestras:',
      [
        'Ejecución del contrato: los datos de tu cuenta, tus recargas y tus compras. Sin ellos no podemos venderte ni entregarte un pin.',
        'Consentimiento: los correos de novedades y avisos de stock. Es opcional, lo activas o lo quitas cuando quieras y no afecta a tu capacidad de comprar.',
        'Obligación legal: conservar los registros de las operaciones cuando la normativa tributaria o de defensa del consumidor así lo exija.',
        'Interés legítimo: prevenir fraudes y usos abusivos de la tienda, como comprobantes duplicados o cuentas falsas.',
      ],
    ],
  },
  {
    titulo: 'Quién más ve tus datos',
    parrafos: [
      'No vendemos, alquilamos ni cedemos tus datos a nadie con fines comerciales. Para operar nos apoyamos en proveedores tecnológicos que actúan como encargados del tratamiento y solo pueden usar los datos para prestarnos su servicio:',
      [
        'Supabase: base de datos y autenticación, donde se guarda tu cuenta.',
        'Vercel: alojamiento del sitio web.',
        'Resend: envío de los correos de la tienda.',
        'Google: solo si eliges iniciar sesión con tu cuenta de Google.',
      ],
      'Estos servicios tienen servidores fuera del Ecuador, principalmente en Estados Unidos, por lo que tus datos son objeto de una transferencia internacional. Los hemos elegido porque cuentan con cláusulas de protección de datos y medidas de seguridad reconocidas internacionalmente.',
    ],
  },
  {
    titulo: 'Cuánto tiempo los guardamos',
    parrafos: [
      'Mantenemos los datos de tu cuenta mientras la tengas abierta. Si pides eliminarla, borramos tus datos personales salvo aquellos que debamos conservar por obligación legal o para atender un reclamo en curso.',
      'Los registros de compras y movimientos de saldo se conservan por el plazo que exija la normativa tributaria y de defensa del consumidor, aunque cierres tu cuenta. Es la parte que no podemos borrar a petición: son el respaldo de operaciones con dinero.',
      'Los comprobantes de transferencia se eliminan una vez verificada la recarga y transcurrido el plazo razonable para un reclamo.',
    ],
  },
  {
    titulo: 'Tus derechos',
    parrafos: [
      'La LOPDP te reconoce estos derechos sobre tus datos, y puedes ejercerlos gratuitamente escribiéndonos:',
      [
        'Acceso: saber qué datos tuyos tenemos y qué hacemos con ellos.',
        'Rectificación y actualización: corregir lo que esté mal o incompleto. Tu nombre y teléfono los puedes cambiar tú mismo desde Mi cuenta.',
        'Eliminación: pedir que borremos tus datos, con los límites del punto anterior.',
        'Oposición: pedir que dejemos de tratar tus datos para una finalidad concreta.',
        'Portabilidad: recibir tus datos en un formato que puedas llevarte.',
        'Limitación del tratamiento: pedir que los conservemos pero no los usemos, mientras se resuelve una reclamación.',
        'No ser objeto de decisiones automatizadas que te afecten significativamente.',
      ],
      'Las recargas las aprueba o rechaza una persona, no un sistema automático. Si alguna vez eso cambia, te lo diremos aquí.',
      `Para ejercer cualquiera de estos derechos escribe a ${TIENDA.correo} desde el correo de tu cuenta. Si consideras que no te hemos atendido bien, puedes presentar un reclamo ante la Superintendencia de Protección de Datos Personales del Ecuador.`,
    ],
  },
  {
    titulo: 'Cómo protegemos tus datos',
    parrafos: [
      'Todo el sitio funciona sobre conexión cifrada (HTTPS). Las contraseñas se guardan cifradas y ni siquiera nosotros podemos verlas. El acceso a los datos está restringido a nivel de base de datos, de modo que cada cliente solo puede leer lo suyo.',
      'Si ocurriera una vulneración de seguridad que afecte a tus datos, lo notificaremos a la Superintendencia de Protección de Datos Personales dentro de los 5 días hábiles siguientes a conocerla, y a ti sin dilación cuando suponga un riesgo alto para tus derechos.',
    ],
  },
  {
    titulo: 'Menores de edad',
    parrafos: [
      `La tienda está dirigida a personas mayores de ${EDAD_MINIMA} años. No creamos cuentas a sabiendas de menores de edad sin la autorización de su representante legal.`,
      'Si eres madre, padre o representante legal y detectas que un menor a tu cargo creó una cuenta, escríbenos y la eliminaremos junto con sus datos.',
    ],
  },
  {
    titulo: 'Cookies y tecnologías similares',
    parrafos: [
      'Usamos únicamente el almacenamiento imprescindible para que la tienda funcione: la sesión que te mantiene identificado mientras navegas y la preferencia de tema claro u oscuro. No usamos cookies de publicidad ni de seguimiento de terceros, ni perfilamos tu navegación.',
      'La sesión se guarda solo mientras el navegador está abierto: al cerrarlo, se cierra tu sesión.',
    ],
  },
  {
    titulo: 'Cambios en esta política',
    parrafos: [
      `Si modificamos esta política te avisaremos en la tienda y, cuando el cambio sea relevante, por correo. Versión vigente: ${VERSION_LEGAL}.`,
    ],
  },
]

export const TERMINOS: Seccion[] = [
  {
    titulo: 'Qué vendemos',
    parrafos: [
      `${TIENDA.nombre} vende códigos (pines) para canjear diamantes en Free Fire. Somos una tienda independiente: no tenemos relación, patrocinio ni respaldo de Garena ni de sus empresas vinculadas. Las marcas mencionadas pertenecen a sus respectivos titulares.`,
      'El pin es un código digital. Una vez que te lo entregamos, queda a tu disposición y eres responsable de guardarlo y canjearlo correctamente.',
    ],
  },
  {
    titulo: 'Tu cuenta',
    parrafos: [
      `Para comprar necesitas una cuenta con datos reales y ser mayor de ${EDAD_MINIMA} años. Si eres menor, necesitas la autorización de tu representante legal.`,
      'Eres responsable de mantener tu contraseña en secreto y de lo que ocurra en tu cuenta. Avísanos de inmediato si crees que alguien entró sin tu permiso.',
      'Podemos suspender una cuenta que use datos falsos, comprobantes alterados o que intente aprovechar fallos del sistema.',
    ],
  },
  {
    titulo: 'Saldo de la tienda',
    parrafos: [
      'Para comprar primero recargas saldo mediante transferencia bancaria y subes el comprobante. Revisamos la transferencia manualmente y acreditamos el saldo cuando la verificamos.',
      'El saldo es crédito para usar dentro de la tienda. No es dinero electrónico, no genera intereses y no es canjeable por efectivo. Podrás usarlo para comprar cualquier producto disponible, sin fecha de caducidad.',
      'Si envías un comprobante que no corresponde a una transferencia real, la solicitud será rechazada y podremos suspender tu cuenta.',
    ],
  },
  {
    titulo: 'Compras, entrega y devoluciones',
    parrafos: [
      'La compra se descuenta de tu saldo y el código aparece de inmediato en tu cuenta, además de enviarse a tu correo.',
      'La Ley Orgánica de Defensa del Consumidor reconoce el derecho a devolver lo comprado por internet dentro de los tres días siguientes a su recepción, siempre que la naturaleza del bien lo permita y esté en el mismo estado en que se recibió. Un pin es un código de un solo uso: en cuanto se te muestra, ya no puede devolverse a nuestro inventario ni revenderse, por lo que su naturaleza no admite devolución una vez entregado.',
      'Lo que sí hacemos: si un código llega defectuoso, ya usado o no funciona por causa nuestra, abre un reclamo desde tu compra y lo reponemos o te devolvemos el importe a tu saldo. Para eso está el sistema de reclamos.',
      'No cubrimos errores al canjear, como introducir el código en la cuenta equivocada de Free Fire.',
    ],
  },
  {
    titulo: 'Precios y disponibilidad',
    parrafos: [
      'Los precios están en dólares de los Estados Unidos e incluyen los impuestos que correspondan. Pueden cambiar en cualquier momento, pero el precio que se aplica a tu compra es el que veías al confirmarla.',
      'La disponibilidad depende de nuestro inventario. Si un producto está agotado puedes anotarte para que te avisemos cuando vuelva.',
    ],
  },
  {
    titulo: 'Nuestra responsabilidad',
    parrafos: [
      'Respondemos por entregarte un código válido y funcional. No respondemos por caídas del servicio de Garena, cambios en las condiciones del juego, ni por el uso que hagas de los diamantes una vez canjeados.',
      'Hacemos lo posible por mantener la tienda disponible, pero puede haber interrupciones por mantenimiento o por fallos de los servicios de los que dependemos.',
    ],
  },
  {
    titulo: 'Reclamos y ley aplicable',
    parrafos: [
      `Si algo sale mal, escríbenos primero a ${TIENDA.correo} o abre un reclamo desde tu compra: la mayoría de los problemas se resuelven el mismo día.`,
      'Estos términos se rigen por la legislación de la República del Ecuador. Como consumidor conservas todos los derechos que te reconoce la Ley Orgánica de Defensa del Consumidor, incluida la posibilidad de acudir a la Defensoría del Pueblo.',
      `Versión vigente: ${VERSION_LEGAL}.`,
    ],
  },
]
