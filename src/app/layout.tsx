import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import {
  SITIO, MARCA, LOCALE, CLAVES, DESCRIPCION, VERIFICACION_GOOGLE,
  jsonLdTienda, jsonLdSitio,
} from '@/lib/seo'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '@/components/Navbar'
import BarraMovil from '@/components/BarraMovil'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  // Sin metadataBase, Next no puede convertir las rutas de las imágenes de
  // Open Graph en absolutas, y WhatsApp o Facebook no muestran la miniatura.
  metadataBase: new URL(SITIO),
  title: {
    default: 'Diamantes Free Fire Ecuador — Pines con entrega inmediata | FFPINS',
    template: '%s | FFPINS',
  },
  description: DESCRIPCION,
  keywords: CLAVES,
  applicationName: MARCA,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: LOCALE,
    url: SITIO,
    siteName: MARCA,
    title: 'Diamantes Free Fire Ecuador — Pines con entrega inmediata',
    description: DESCRIPCION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'FFPINS — Diamantes Free Fire Ecuador' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Diamantes Free Fire Ecuador — FFPINS',
    description: DESCRIPCION,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'shopping',
  // Solo aparece si hay código puesto en lib/seo.ts.
  ...(VERIFICACION_GOOGLE ? { verification: { google: VERIFICACION_GOOGLE } } : {}),
}

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // respeta el notch y la barra inferior del iPhone
}

/**
 * Aplica el tema guardado antes de que el navegador pinte nada. Va como script
 * suelto y bloqueante a propósito: hacerlo en un efecto de React mostraría la
 * página en claro durante un instante antes de saltar a oscuro.
 *
 * Sin preferencia guardada manda el tema claro, aunque el sistema esté en
 * oscuro: es la decisión de diseño de la tienda.
 */
const SCRIPT_TEMA = `
try {
  var t = localStorage.getItem('tema');
  document.documentElement.dataset.tema = t === 'oscuro' ? 'oscuro' : 'claro';
} catch (e) {
  document.documentElement.dataset.tema = 'claro';
}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang es-EC y no "es" a secas: le dice al buscador que esto es para Ecuador.
  return (
    <html lang="es-EC" data-tema="claro" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {/* Identidad de la tienda para el buscador: quién vende, dónde y cómo
            se paga. Va en el layout porque vale para todas las páginas. */}
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLdTienda(), jsonLdSitio()]) }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Navbar />

        {/* El padding inferior deja sitio a la barra de navegación móvil. */}
        <main className="flex-1 pb-20 sm:pb-0">{children}</main>

        {/* En móvil también se ve: los enlaces legales tienen que estar
            accesibles desde cualquier página, no solo en escritorio. */}
        <footer className="border-t border-linea px-4 py-6 text-center text-xs text-tenue">
          <p>FFPINS · El saldo es crédito de tienda, no reembolsable en efectivo.</p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link href="/legal/terminos" className="hover:text-marca">Términos y Condiciones</Link>
            <span aria-hidden>·</span>
            <Link href="/legal/privacidad" className="hover:text-marca">Política de Privacidad</Link>
          </p>
          <p className="mt-2 text-tenue">
            Tienda independiente. Sin relación con Garena ni Free Fire.
          </p>
        </footer>

        <BarraMovil />

        <Toaster
          position="top-center"
          offset={68}
          duration={3500}
          toastOptions={{
            style: {
              background: 'var(--color-panel)',
              border: '1px solid var(--color-linea)',
              color: 'var(--color-fuerte)',
              boxShadow: 'var(--sombra-flotante)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  )
}
