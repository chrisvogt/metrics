'use client'

import { useEffect, useState } from 'react'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { apiClient } from '@/auth/apiClient'
import { useAuth } from '@/auth/AuthContext'

/**
 * Steam returns OAuth tokens in the URL fragment (see Steam Web API OAuth overview).
 * This page reads `#access_token` / `state` and POSTs them to the API.
 */
export function SteamOAuthCallbackClient() {
  const { user, apiSessionReady } = useAuth()
  const [message, setMessage] = useState('Completing Steam link…')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const params = new URLSearchParams(hash)
    const denied = params.get('error')
    if (denied === 'access_denied') {
      window.location.replace('/onboarding/?oauth=steam&status=error&reason=access_denied')
      return
    }

    const access_token = params.get('access_token')
    const state = params.get('state')

    if (!access_token || !state) {
      setMessage('No Steam authorization in this page. Open “Link account” from the app and try again.')
      return
    }

    if (!apiSessionReady) return

    if (!user) {
      setMessage('Sign in to the operator console in this browser, then start Steam linking again.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const idToken = await user.getIdToken()
        const res = await apiClient.postJson(
          '/api/oauth/steam/complete',
          { access_token, state },
          { idToken }
        )
        const data = (await res.json()) as {
          ok?: boolean
          redirectPath?: string
          error?: string
        }
        if (cancelled) return
        const rp = data.redirectPath
        if (typeof rp === 'string' && rp.startsWith('/')) {
          window.location.replace(rp)
          return
        }
        window.location.replace(
          `/onboarding/?oauth=steam&status=error&reason=${encodeURIComponent(data.error ?? 'unknown')}`
        )
      } catch {
        if (!cancelled) {
          window.location.replace('/onboarding/?oauth=steam&status=error&reason=network')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, apiSessionReady])

  return (
    <AuthScenePageShell>
      <div style={{ padding: '2rem', maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>{message}</p>
      </div>
    </AuthScenePageShell>
  )
}
