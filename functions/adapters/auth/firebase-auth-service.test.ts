import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FirebaseAuthService } from './firebase-auth-service.js'

describe('FirebaseAuthService', () => {
  const authMethods = {
    createSessionCookie: vi.fn(),
    deleteUser: vi.fn(),
    getUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
  }

  const admin = {
    auth: vi.fn(() => authMethods),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps verified session cookie claims onto the auth-service shape', async () => {
    authMethods.verifySessionCookie.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      email_verified: true,
    })

    const service = new FirebaseAuthService(admin as never)

    await expect(service.verifySessionCookie('session-cookie')).resolves.toEqual({
      uid: 'user-1',
      email: 'user@example.com',
      emailVerified: true,
    })
    expect(authMethods.verifySessionCookie).toHaveBeenCalledWith('session-cookie', true)
  })

  it('maps user records onto the provider-neutral profile shape', async () => {
    authMethods.getUser.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: 'https://example.com/avatar.png',
      emailVerified: true,
      metadata: {
        creationTime: 'yesterday',
        lastSignInTime: 'today',
      },
    })

    const service = new FirebaseAuthService(admin as never)

    await expect(service.getUser('user-1')).resolves.toEqual({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: 'https://example.com/avatar.png',
      emailVerified: true,
      creationTime: 'yesterday',
      lastSignInTime: 'today',
    })
  })

  it('passes through create-session and revoke/delete calls', async () => {
    authMethods.createSessionCookie.mockResolvedValue('cookie-value')
    authMethods.revokeRefreshTokens.mockResolvedValue(undefined)
    authMethods.deleteUser.mockResolvedValue(undefined)

    const service = new FirebaseAuthService(admin as never)

    await expect(
      service.createSessionCookie('jwt-token', { expiresIn: 1234 })
    ).resolves.toBe('cookie-value')
    await expect(service.revokeRefreshTokens('user-1')).resolves.toBeUndefined()
    await expect(service.deleteUser('user-1')).resolves.toBeUndefined()

    expect(authMethods.createSessionCookie).toHaveBeenCalledWith('jwt-token', { expiresIn: 1234 })
    expect(authMethods.revokeRefreshTokens).toHaveBeenCalledWith('user-1')
    expect(authMethods.deleteUser).toHaveBeenCalledWith('user-1')
  })
})
