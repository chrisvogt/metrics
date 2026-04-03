'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/auth/AuthContext'
import { ThemeSync } from '@/theme/ThemeSync'
import {
  CHRONOGROVE_THEME_STORAGE_KEY,
  CHRONOGROVE_THEMES,
  DEFAULT_THEME,
} from '@/theme/chronogroveTheme'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme={DEFAULT_THEME}
      themes={[...CHRONOGROVE_THEMES]}
      enableSystem={false}
      storageKey={CHRONOGROVE_THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <AuthProvider>
        <ThemeSync>{children}</ThemeSync>
      </AuthProvider>
    </ThemeProvider>
  )
}
