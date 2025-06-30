import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import getAccessToken from './get-access-token.js'

// Mock dependencies
vi.mock('request-promise', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('getAccessToken', () => {
  let mockRequestPost

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock function
    const requestPromise = await import('request-promise')
    mockRequestPost = requestPromise.default.post
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
      access_token: 'test-access-token',
      expires_in: 3600,
      scope: 'user-read-private user-read-email'
    }

    mockRequestPost.mockResolvedValue(mockResponse)

    const result = await getAccessToken(mockParams)

    // Verify request was called with correct parameters
    expect(mockRequestPost).toHaveBeenCalledWith({
      form: {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        grant_type: 'refresh_token',
        refresh_token: 'test-refresh-token',
        redirect_uri: 'https://example.com/callback'
      },
      fullResponse: false,
      json: true,
      retryStrategy: expect.any(Function),
      url: 'https://accounts.spotify.com/api/token'
    })

    // Verify retry strategy function
    const retryStrategy = mockRequestPost.mock.calls[0][0].retryStrategy
    expect(retryStrategy(new Error('Network error'))).toBe(true)
    expect(retryStrategy(null)).toBe(false)

    // Verify result structure
    expect(result).toHaveProperty('accessToken', 'test-access-token')
    expect(result).toHaveProperty('scope', 'user-read-private user-read-email')
    expect(result).toHaveProperty('expiresAt')
    expect(result.expiresAt).toBeInstanceOf(Date)

    // Verify expiresAt calculation (should be 3600 - 300 = 3300 seconds from now)
    const expectedExpiresAt = new Date()
    expectedExpiresAt.setSeconds(expectedExpiresAt.getSeconds() + 3300)
    
    // Allow for small timing differences (within 1 second)
    expect(Math.abs(result.expiresAt.getTime() - expectedExpiresAt.getTime())).toBeLessThan(1000)
  })

  it('should handle different expiration times correctly', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    const mockResponse = {
      access_token: 'test-access-token',
      expires_in: 7200, // 2 hours
      scope: 'user-read-private'
    }

    mockRequestPost.mockResolvedValue(mockResponse)

    const result = await getAccessToken(mockParams)

    // Verify expiresAt calculation for 7200 seconds (should be 7200 - 300 = 6900 seconds from now)
    const expectedExpiresAt = new Date()
    expectedExpiresAt.setSeconds(expectedExpiresAt.getSeconds() + 6900)
    
    // Allow for small timing differences (within 1 second)
    expect(Math.abs(result.expiresAt.getTime() - expectedExpiresAt.getTime())).toBeLessThan(1000)
  })

  it('should handle request errors', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    const mockError = new Error('Authentication failed')
    mockRequestPost.mockRejectedValue(mockError)

    await expect(getAccessToken(mockParams)).rejects.toThrow('Authentication failed')
  })

  it('should handle malformed response', async () => {
    const mockParams = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectURI: 'https://example.com/callback',
      refreshToken: 'test-refresh-token'
    }

    const mockResponse = {
      // Missing required fields
      error: 'invalid_grant'
    }

    mockRequestPost.mockResolvedValue(mockResponse)

    const result = await getAccessToken(mockParams)

    // Should still return a result with undefined values
    expect(result).toHaveProperty('accessToken', undefined)
    expect(result).toHaveProperty('scope', undefined)
    expect(result).toHaveProperty('expiresAt')
  })
}) 