import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '@/components/Navbar'
import BarraMovil from '@/components/BarraMovil'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'FFPINS — Diamantes Free Fire',
  description: 'Compra pines de diamantes para Free Fire con entrega inmediata. Recarga tu saldo por transferencia bancaria.',
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
  return (
    <html lang="es" data-tema="claro" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Navbar />

        {/* El padding inferior deja sitio a la barra de navegación móvil. */}
        <main className="flex-1 pb-20 sm:pb-0">{children}</main>

        <footer className="hidden border-t border-linea py-6 text-center text-xs text-tenue sm:block">
          FFPINS · El saldo es crédito de tienda, no reembolsable en efectivo.
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
