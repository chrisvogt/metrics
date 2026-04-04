import type { User } from 'firebase/auth'

/**
 * Builds `fetch` headers for public widget GETs from the operator console.
 * When signed in, uses a freshly minted ID token so production cross-origin calls
 * (console host → API host) still authenticate without relying on session cookies.
 */
export async function buildWidgetFetchHeaders(user: User | null | undefined): Promise<HeadersInit> {
  if (!user) return {}
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}
