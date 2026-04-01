'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeSync } from '@/theme/ThemeSync'
import { CHRONOGROVE_THEMES, DEFAULT_THEME } from '@/theme/chronogroveTheme'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME}
      themes={[...CHRONOGROVE_THEMES]}
      enableSystem={false}
      storageKey="chronogrove-ui-theme"
      disableTransitionOnChange
    >
      <AuthProvider>
        <ThemeSync>{children}</ThemeSync>
      </AuthProvider>
    </ThemeProvider>
  )
}
