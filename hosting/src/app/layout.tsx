import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Metrics API – Chris Vogt',
  description:
    'Personal Metrics API admin for chrisvogt.me. Not a general login service.',
  openGraph: {
    title: 'Metrics API – Chris Vogt',
    description:
      'Personal Metrics API admin for chrisvogt.me. Not a general login service.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
