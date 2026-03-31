import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import getUserProfile from './get-user-profile.js'

// Mock dependencies
vi.mock('./spotify-client.js', () => ({
  default: vi.fn()
}))

describe('getUserProfile', () => {
  let mockSpotifyClient

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock function
    const spotifyClient = await import('./spotify-client.js')
    mockSpotifyClient = spotifyClient.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully get user profile with valid access token', async () => {
    const accessToken = 'test-access-token'
    const mockUserProfile = {
      id: 'artinreality',
      display_name: 'artinreality',
      country: 'US',
      product: 'premium',
      type: 'user',
      uri: 'spotify:user:artinreality',
      external_urls: {
        spotify: 'https://open.spotify.com/user/artinreality'
      },
      followers: {
        href: null,
        total: 43
      },
      images: [
        {
          height: null,
          url: 'https://profile-images.scdn.co/images/userprofile/default/88882671c8c71a284cae03d4b6f60d3055f7ccae',
          width: null
        }
      ],
      explicit_content: {
        filter_enabled: false,
        filter_locked: false
      },
      href: 'https://api.spotify.com/v1/users/artinreality'
    }

    mockSpotifyClient.mockResolvedValue({ body: mockUserProfile })

    const result = await getUserProfile(accessToken)

    // Verify request was called with correct parameters
    expect(mockSpotifyClient).toHaveBeenCalledWith('me', {
      headers: { Authorization: 'Bearer test-access-token' },
    })

    // Verify result
    expect(result).toEqual(mockUserProfile)
  })

  it('should handle request errors', async () => {
    const accessToken = 'invalid-access-token'
    const mockError = new Error('Unauthorized')

    mockSpotifyClient.mockRejectedValue(mockError)

    await expect(getUserProfile(accessToken)).rejects.toThrow('Unauthorized')
  })

  it('should handle empty response', async () => {
    const accessToken = 'test-access-token'
    const mockEmptyResponse = {}

    mockSpotifyClient.mockResolvedValue({ body: mockEmptyResponse })

    const result = await getUserProfile(accessToken)

    // Should return the empty response as-is
    expect(result).toEqual(mockEmptyResponse)
  })

  it('should handle null response', async () => {
    const accessToken = 'test-access-token'
    const mockNullResponse = null

    mockSpotifyClient.mockResolvedValue({ body: mockNullResponse })

    const result = await getUserProfile(accessToken)

    // Should return null as-is
    expect(result).toBeNull()
  })
}) 