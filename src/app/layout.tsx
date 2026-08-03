import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '@/components/Navbar'
import BarraMovil from '@/components/BarraMovil'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'PinStore FF — Diamantes Free Fire',
  description: 'Compra pines de diamantes para Free Fire con entrega inmediata. Recarga tu saldo por transferencia bancaria.',
}

export const viewport: Viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // respeta el notch y la barra inferior del iPhone
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Navbar />

        {/* El padding inferior deja sitio a la barra de navegación móvil. */}
        <main className="flex-1 pb-20 sm:pb-0">{children}</main>

        <footer className="hidden border-t border-linea py-6 text-center text-xs text-tenue sm:block">
          PinStore FF · El saldo es crédito de tienda, no reembolsable en efectivo.
        </footer>

        <BarraMovil />

        <Toaster
          position="top-center"
          offset={68}
          duration={3500}
          toastOptions={{
            style: {
              background: '#12151c',
              border: '1px solid #232833',
              color: '#e7eaf0',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  )
}
