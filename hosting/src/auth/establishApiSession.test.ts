/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from 'firebase/auth'

import {
  establishApiSession,
  establishApiSessionCoalesced,
  resetSessionEstablishmentTracking,
  isApiSessionEstablishedForUid,
} from './establishApiSession'

const createSession = vi.fn()
const getIdToken = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    createSession: (...args: unknown[]) => createSession(...args),
  },
}))

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
    await establishApiSession(mockUser(['one']))
    expect(createSession).toHaveBeenCalledWith('one')
    expect(localStorage.getItem('authToken')).toBe(null)
  })

  it('stores token in localStorage when createSession fails', async () => {
    createSession.mockRejectedValue(new Error('network'))
    await establishApiSession(mockUser(['fallback-token', 'fallback-token']))
    expect(localStorage.getItem('authToken')).toBe('fallback-token')
  })

  it('ignores when getIdToken fails in fallback path', async () => {
    createSession.mockRejectedValue(new Error('network'))
    getIdToken.mockRejectedValueOnce(new Error('expired')).mockRejectedValue(new Error('still bad'))
    const u = { getIdToken } as unknown as User
    await establishApiSession(u)
    expect(localStorage.getItem('authToken')).toBe(null)
  })

  it('when initial getIdToken throws, still tries fallback token', async () => {
    getIdToken
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('recovery')
    const u = { getIdToken } as unknown as User
    await establishApiSession(u)
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
