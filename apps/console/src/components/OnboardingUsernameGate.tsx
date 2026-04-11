'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/auth/AuthContext'
import { apiClient } from '@/auth/apiClient'
import { mustVerifyEmailBeforeConsole } from '@/lib/emailVerificationGate'
import { hasCompletedUsernameSelection } from '@/lib/onboardingUsernameCompletion'

function shouldSkipOnboardingRedirect(pathname: string): boolean {
  const base = pathname.replace(/\/$/, '') || '/'
  if (base === '/onboarding') return true
  if (base.startsWith('/verify-email')) return true
  if (base === '/signup' || base.startsWith('/signup/')) return true
  if (base === '/auth' || base.startsWith('/auth/')) return true
  if (base.startsWith('/u/')) return true
  if (base === '/about' || base === '/docs' || base === '/privacy') return true
  return false
}

/**
 * Sends verified users who have not chosen a public username to `/onboarding/` (username step).
 * Other wizard steps and providers can be finished from Settings / dashboard.
 */
export function OnboardingUsernameGate() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const { user, loading, apiSessionReady } = useAuth()

  useEffect(() => {
    if (loading || !user || !apiSessionReady) return
    if (mustVerifyEmailBeforeConsole(user)) return
    if (shouldSkipOnboardingRedirect(pathname)) return

    let cancelled = false

    void (async () => {
      try {
        const idToken = await user.getIdToken()
        const res = await apiClient.getJson('/api/onboarding/progress', { idToken })
        if (cancelled || !res.ok) return
        const data = (await res.json().catch(() => ({}))) as {
          payload?: { username: string | null; completedSteps: string[] }
        }
        const p = data.payload
        if (cancelled || !p) return
        if (hasCompletedUsernameSelection(p)) return
        router.replace('/onboarding/')
      } catch {
        /* ignore — onboarding page can still load */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, loading, apiSessionReady, pathname, router])

  return null
}
