import type { User } from 'firebase/auth'

import { apiClient } from './apiClient'

/** Create HttpOnly session cookie; fall back to localStorage Bearer if session POST fails. */
export async function establishApiSession(u: User): Promise<void> {
  try {
    const token = await u.getIdToken()
    await apiClient.createSession(token)
  } catch {
    try {
      const token = await u.getIdToken()
      localStorage.setItem('authToken', token)
    } catch {
      // ignore
    }
  }
}
