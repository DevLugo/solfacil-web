import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Solufácil',
    template: '%s | Solufácil',
  },
  description: 'Sistema de gestión de préstamos - Solufácil',
  keywords: ['préstamos', 'fintech', 'gestión', 'cobranza', 'solufacil'],
  authors: [{ name: 'Solufácil' }],
  creator: 'Solufácil',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F26522' },  /* Naranja Solufacil */
    { media: '(prefers-color-scheme: dark)', color: '#14142B' },   /* Azul Marino oscuro */
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
