import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import getAccessToken from './get-access-token.js'

vi.mock('got', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('getAccessToken', () => {
  let mockGotPost

  beforeEach(async () => {
    vi.clearAllMocks()
    const got = await import('got')
    mockGotPost = got.default.post
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully get access token with correct parameters', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    const mockResponse = {
      body: {
        access_token: 'test-access-token',
        expires_in: 3600,
        scope: 'user-read-private user-read-email'
      }
    }

    mockGotPost.mockResolvedValue(mockResponse)

    const result = await getAccessToken(mockParams)

    expect(mockGotPost).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.objectContaining({
        form: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          grant_type: 'refresh_token',
          refresh_token: 'test-refresh-token',
          redirect_uri: 'https://example.com/callback'
        },
        responseType: 'json',
        retry: { limit: 2 }
      })
    )

    expect(result).toHaveProperty('accessToken', 'test-access-token')
    expect(result).toHaveProperty('scope', 'user-read-private user-read-email')
    expect(result).toHaveProperty('expiresAt')
    expect(result.expiresAt).toBeInstanceOf(Date)

    const expectedExpiresAt = new Date()
    expectedExpiresAt.setSeconds(expectedExpiresAt.getSeconds() + 3300)
    expect(Math.abs(result.expiresAt.getTime() - expectedExpiresAt.getTime())).toBeLessThan(1000)
  })

  it('should handle different expiration times correctly', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    mockGotPost.mockResolvedValue({
      body: {
        access_token: 'test-access-token',
        expires_in: 7200,
        scope: 'user-read-private'
      }
    })

    const result = await getAccessToken(mockParams)

    const expectedExpiresAt = new Date()
    expectedExpiresAt.setSeconds(expectedExpiresAt.getSeconds() + 6900)
    expect(Math.abs(result.expiresAt.getTime() - expectedExpiresAt.getTime())).toBeLessThan(1000)
  })

  it('should handle request errors', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    mockGotPost.mockRejectedValue(new Error('Authentication failed'))

    await expect(getAccessToken(mockParams)).rejects.toThrow('Authentication failed')
  })

  it('should handle malformed response', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    mockGotPost.mockResolvedValue({
      body: { error: 'invalid_grant' }
    })

    const result = await getAccessToken(mockParams)

    expect(result).toHaveProperty('accessToken', undefined)
    expect(result).toHaveProperty('scope', undefined)
    expect(result).toHaveProperty('expiresAt')
  })
})
