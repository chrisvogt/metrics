import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Steam',
  description: 'Finish linking your Steam account to Chronogrove.',
}

export default function SteamOAuthLayout({ children }: { children: ReactNode }) {
  return children
}
