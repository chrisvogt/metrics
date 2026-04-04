'use client'

import { useTheme } from 'next-themes'
import { useCallback } from 'react'
import { useAuth } from '@/auth/AuthContext'
import type { ChronogroveThemeId } from '@/theme/chronogroveTheme'
import { DEFAULT_THEME, isChronogroveTheme } from '@/theme/chronogroveTheme'
import { persistChronogroveTheme } from '@/theme/persistChronogroveTheme'

/** Resolved Chronogrove theme + `persist()` that applies UI and syncs to Firestore when signed in. */
export function useChronogroveThemePersist() {
  const { setTheme, resolvedTheme } = useTheme()
  const { user, apiSessionReady } = useAuth()

  const activeTheme: ChronogroveThemeId = isChronogroveTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME

  const persist = useCallback(
    (id: ChronogroveThemeId) => persistChronogroveTheme(id, { setTheme, user, apiSessionReady }),
    [setTheme, user, apiSessionReady]
  )

  return { activeTheme, persist, apiSessionReady }
}
