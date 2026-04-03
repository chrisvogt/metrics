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
    'Backend and operator console for provider-backed widgets (Discogs, Steam, Instagram, …) on www.chrisvogt.me. Feeds the open-source Gatsby theme; WordPress themes and Web Components can use the same public JSON API.',
  openGraph: {
    title: 'Chronogrove',
    description:
      'Sync third-party accounts into a stable widget API — powers www.chrisvogt.me and the Gatsby theme Chronogrove; broader themes and embeddable components planned.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
