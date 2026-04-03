'use client'

import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/auth/AuthContext'
import { apiClient } from '@/auth/apiClient'
import {
  CHRONOGROVE_THEME_STORAGE_KEY,
  type ChronogroveThemeId,
  isChronogroveTheme,
  normalizeChronogroveThemeId,
} from '@/theme/chronogroveTheme'

function normalizeTheme(value: unknown): ChronogroveThemeId {
  return normalizeChronogroveThemeId(value)
}

/**
 * After Firebase session is ready, load `settings.theme` from the API and align next-themes.
 * Logout does not reset UI theme (keep last choice until next full load).
 */
export function ThemeSync({ children }: { children: ReactNode }) {
  const { user, apiSessionReady } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(CHRONOGROVE_THEME_STORAGE_KEY)
      if (raw === 'dark-forest') {
        const next = normalizeChronogroveThemeId(raw)
        localStorage.setItem(CHRONOGROVE_THEME_STORAGE_KEY, next)
        setTheme(next)
      }
    } catch {
      /* ignore */
    }
  }, [setTheme])

  useEffect(() => {
    if (!user || !apiSessionReady) return

    let cancelled = false
    ;(async () => {
      try {
        const idToken = await user.getIdToken()
        const res = await apiClient.getJson('/api/user/settings', { idToken })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { ok?: boolean; payload?: { theme?: string } }
        const t = normalizeTheme(data.payload?.theme)
        if (cancelled) return
        setTheme(t)
      } catch {
        /* keep current next-themes value */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, apiSessionReady, setTheme])

  useEffect(() => {
    if (!resolvedTheme || !isChronogroveTheme(resolvedTheme)) return
    document.documentElement.dataset.chronogroveTheme = resolvedTheme
  }, [resolvedTheme])

  return <>{children}</>
}
