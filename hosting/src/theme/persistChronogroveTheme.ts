import type { User } from 'firebase/auth'
import { apiClient } from '@/auth/apiClient'
import type { ChronogroveThemeId } from '@/theme/chronogroveTheme'

/** Apply theme in the UI immediately, then sync to Firestore when signed in. */
export async function persistChronogroveTheme(
  next: ChronogroveThemeId,
  ctx: {
    setTheme: (value: string) => void
    user: User | null
    apiSessionReady: boolean
  }
): Promise<{ serverOk: boolean; error?: string }> {
  ctx.setTheme(next)
  if (!ctx.user || !ctx.apiSessionReady) {
    return { serverOk: true }
  }
  try {
    const idToken = await ctx.user.getIdToken()
    const res = await apiClient.patchJson('/api/user/settings', { theme: next }, { idToken })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      return {
        serverOk: false,
        error: (errBody as { error?: string }).error ?? `Save failed (${res.status})`,
      }
    }
    return { serverOk: true }
  } catch (e) {
    return {
      serverOk: false,
      error: e instanceof Error ? e.message : 'Could not save theme.',
    }
  }
}
