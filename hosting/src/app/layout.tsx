import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Chronogrove',
    template: '%s | Chronogrove',
  },
  description:
    'Chronogrove is a self-hosted personal data core — public feeds, health monitoring, and authenticated sync for Gatsby, WordPress, Astro, and any theme built on top.',
  openGraph: {
    title: 'Chronogrove',
    description:
      'A self-hosted personal data core that feeds public JSON, monitors provider health, and syncs data for any front-end framework.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
