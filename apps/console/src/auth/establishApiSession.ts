import type { User } from 'firebase/auth'

import { apiClient, API_ERROR_EMAIL_NOT_VERIFIED, SessionCreateError } from './apiClient'

let completedSessionUid: string | null = null
const inflightByUid = new Map<string, Promise<void>>()
let establishmentGeneration = 0

export function resetSessionEstablishmentTracking(): void {
  establishmentGeneration += 1
  completedSessionUid = null
  inflightByUid.clear()
}

/** Whether this tab has already completed `establishApiSession` for `uid` since last sign-out. */
export function isApiSessionEstablishedForUid(uid: string): boolean {
  return completedSessionUid === uid
}

/**
 * Create HttpOnly session cookie; fall back to localStorage Bearer if session POST fails.
 * @returns whether a backend session or Bearer fallback was stored (false for unverified-email 403).
 */
export async function establishApiSession(u: User): Promise<boolean> {
  try {
    const token = await u.getIdToken(true)
    await apiClient.createSession(token)
    return true
  } catch (e) {
    if (
      e instanceof SessionCreateError &&
      e.status === 403 &&
      e.errorCode === API_ERROR_EMAIL_NOT_VERIFIED
    ) {
      return false
    }
    try {
      const token = await u.getIdToken()
      localStorage.setItem('authToken', token)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Single-flight session handshake per `uid`: avoids concurrent `POST /api/auth/session` (and CSRF races)
 * when `onAuthStateChanged` and sign-in helpers both run for the same sign-in.
 */
export function establishApiSessionCoalesced(u: User): Promise<void> {
  const uid = u.uid
  if (completedSessionUid === uid) {
    return Promise.resolve()
  }

  const existing = inflightByUid.get(uid)
  if (existing) return existing

  const gen = establishmentGeneration
  const p = establishApiSession(u).then((established) => {
    if (gen === establishmentGeneration && established) {
      completedSessionUid = uid
    }
  })
    .finally(() => {
      if (inflightByUid.get(uid) === p) {
        inflightByUid.delete(uid)
      }
    })

  inflightByUid.set(uid, p)
  return p
}
