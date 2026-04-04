/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from 'firebase/auth'

import { establishApiSession } from './establishApiSession'

const createSession = vi.fn()
const getIdToken = vi.fn()

vi.mock('./apiClient', () => ({
  apiClient: {
    createSession: (...args: unknown[]) => createSession(...args),
  },
}))

function mockUser(tokenReturns: string[] = ['tok-a', 'tok-b']): User {
  let i = 0
  getIdToken.mockImplementation(() => Promise.resolve(tokenReturns[Math.min(i++, tokenReturns.length - 1)]!))
  return { getIdToken } as unknown as User
}

describe('establishApiSession', () => {
  beforeEach(() => {
    createSession.mockReset()
    getIdToken.mockReset()
    localStorage.clear()
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
