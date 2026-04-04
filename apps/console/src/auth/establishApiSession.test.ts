/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from 'firebase/auth'

import {
  establishApiSession,
  establishApiSessionCoalesced,
  resetSessionEstablishmentTracking,
  isApiSessionEstablishedForUid,
} from './establishApiSession'
import { SessionCreateError } from './apiClient'

const createSession = vi.fn()
const getIdToken = vi.fn()

vi.mock('./apiClient', () => {
  class SessionCreateError extends Error {
    readonly status: number
    readonly errorCode?: string

    constructor(message: string, status: number, errorCode?: string) {
      super(message)
      this.name = 'SessionCreateError'
      this.status = status
      this.errorCode = errorCode
    }
  }
  return {
    apiClient: {
      createSession: (...args: unknown[]) => createSession(...args),
    },
    API_ERROR_EMAIL_NOT_VERIFIED: 'email_not_verified',
    SessionCreateError,
  }
})

function mockUser(tokenReturns: string[] = ['tok-a', 'tok-b'], uid = 'mock-uid'): User {
  let i = 0
  getIdToken.mockImplementation(() => Promise.resolve(tokenReturns[Math.min(i++, tokenReturns.length - 1)]!))
  return { uid, getIdToken } as unknown as User
}

describe('establishApiSession', () => {
  beforeEach(() => {
    createSession.mockReset()
    getIdToken.mockReset()
    localStorage.clear()
    resetSessionEstablishmentTracking()
  })

  it('calls createSession with ID token on success', async () => {
    createSession.mockResolvedValue({ ok: true })
    const ok = await establishApiSession(mockUser(['one']))
    expect(ok).toBe(true)
    expect(createSession).toHaveBeenCalledWith('one')
    expect(localStorage.getItem('authToken')).toBe(null)
  })

  it('does not store fallback when session rejects email_not_verified', async () => {
    createSession.mockRejectedValue(new SessionCreateError('email_not_verified', 403, 'email_not_verified'))
    const ok = await establishApiSession(mockUser(['one']))
    expect(ok).toBe(false)
    expect(localStorage.getItem('authToken')).toBe(null)
  })

  it('stores token in localStorage when createSession fails', async () => {
    createSession.mockRejectedValue(new Error('network'))
    const ok = await establishApiSession(mockUser(['fallback-token', 'fallback-token']))
    expect(ok).toBe(true)
    expect(localStorage.getItem('authToken')).toBe('fallback-token')
  })

  it('ignores when getIdToken fails in fallback path', async () => {
    createSession.mockRejectedValue(new Error('network'))
    getIdToken.mockRejectedValueOnce(new Error('expired')).mockRejectedValue(new Error('still bad'))
    const u = { getIdToken } as unknown as User
    const ok = await establishApiSession(u)
    expect(ok).toBe(false)
    expect(localStorage.getItem('authToken')).toBe(null)
  })

  it('when initial getIdToken throws, still tries fallback token', async () => {
    getIdToken
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('recovery')
    const u = { getIdToken } as unknown as User
    const ok = await establishApiSession(u)
    expect(ok).toBe(true)
    expect(createSession).not.toHaveBeenCalled()
    expect(localStorage.getItem('authToken')).toBe('recovery')
  })
})

describe('establishApiSessionCoalesced', () => {
  beforeEach(() => {
    createSession.mockReset()
    getIdToken.mockReset()
    localStorage.clear()
    resetSessionEstablishmentTracking()
  })

  it('joins concurrent calls so createSession runs once', async () => {
    createSession.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ ok: true }), 10)),
    )
    const u = mockUser(['one', 'one'])
    await Promise.all([establishApiSessionCoalesced(u), establishApiSessionCoalesced(u)])
    expect(createSession).toHaveBeenCalledTimes(1)
    expect(isApiSessionEstablishedForUid(u.uid)).toBe(true)
  })

  it('returns immediately after success without another createSession', async () => {
    createSession.mockResolvedValue({ ok: true })
    const u = mockUser(['one'])
    await establishApiSessionCoalesced(u)
    await establishApiSessionCoalesced(u)
    expect(createSession).toHaveBeenCalledTimes(1)
  })

  it('does not mark session established when createSession rejects email_not_verified', async () => {
    createSession.mockRejectedValue(new SessionCreateError('email_not_verified', 403, 'email_not_verified'))
    const u = mockUser(['one'])
    await establishApiSessionCoalesced(u)
    expect(isApiSessionEstablishedForUid(u.uid)).toBe(false)
  })

  it('reset clears completed uid so a later call can createSession again', async () => {
    createSession.mockResolvedValue({ ok: true })
    const u = mockUser(['one', 'two'])
    await establishApiSessionCoalesced(u)
    resetSessionEstablishmentTracking()
    await establishApiSessionCoalesced(u)
    expect(createSession).toHaveBeenCalledTimes(2)
  })

  it('does not throw if reset clears in-flight map before the handshake settles', async () => {
    createSession.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ ok: true }), 25)),
    )
    const u = mockUser(['one'])
    const p = establishApiSessionCoalesced(u)
    resetSessionEstablishmentTracking()
    await expect(p).resolves.toBeUndefined()
    expect(isApiSessionEstablishedForUid(u.uid)).toBe(false)
  })
})
