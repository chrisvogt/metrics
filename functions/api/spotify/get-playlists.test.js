import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import getPlaylists from './get-playlists.js'

// Mock dependencies
vi.mock('got', () => ({
  default: vi.fn()
}))

describe('getPlaylists', () => {
  let mockGot

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock function
    const got = await import('got')
    mockGot = got.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully get playlists with valid access token', async () => {
    const accessToken = 'test-access-token'
    const mockPlaylists = {
      items: [
        {
          id: 'playlist1',
          name: 'Test Playlist 1',
          description: 'A test playlist',
          images: [
            {
              url: 'https://example.com/image1.jpg',
              height: 300,
              width: 300
            }
          ],
          owner: {
            display_name: 'Test User'
          },
          tracks: {
            total: 10
          }
        },
        {
          id: 'playlist2',
          name: 'Test Playlist 2',
          description: 'Another test playlist',
          images: [
            {
              url: 'https://example.com/image2.jpg',
              height: 300,
              width: 300
            }
          ],
          owner: {
            display_name: 'Test User'
          },
          tracks: {
            total: 5
          }
        }
      ],
      total: 2,
      limit: 14,
      offset: 0
    }

    mockGot.mockResolvedValue({ body: mockPlaylists })

    const result = await getPlaylists(accessToken)

    // Verify got was called with correct parameters
    expect(mockGot).toHaveBeenCalledWith('me/playlists', {
      headers: { Authorization: 'Bearer test-access-token' },
      responseType: 'json',
      prefixUrl: 'https://api.spotify.com/v1/',
      searchParams: {
        limit: 14,
        offset: 0
      }
    })

    // Verify result
    expect(result).toEqual(mockPlaylists)
  })

  it('should handle empty playlists response', async () => {
    const accessToken = 'test-access-token'
    const mockEmptyPlaylists = {
      items: [],
      total: 0,
      limit: 14,
      offset: 0
    }

    mockGot.mockResolvedValue({ body: mockEmptyPlaylists })

    const result = await getPlaylists(accessToken)

    expect(result).toEqual(mockEmptyPlaylists)
  })

  it('should handle request errors', async () => {
    const accessToken = 'invalid-access-token'
    const mockError = new Error('Unauthorized')

    mockGot.mockRejectedValue(mockError)

    await expect(getPlaylists(accessToken)).rejects.toThrow('Unauthorized')
  })

  it('should handle single playlist response', async () => {
    const accessToken = 'test-access-token'
    const mockSinglePlaylist = {
      items: [
        {
          id: 'playlist1',
          name: 'Single Playlist',
          description: 'A single test playlist',
          images: [
            {
              url: 'https://example.com/image1.jpg',
              height: 300,
              width: 300
            }
          ],
          owner: {
            display_name: 'Test User'
          },
          tracks: {
            total: 1
          }
        }
      ],
      total: 1,
      limit: 14,
      offset: 0
    }

    mockGot.mockResolvedValue({ body: mockSinglePlaylist })

    const result = await getPlaylists(accessToken)

    expect(result).toEqual(mockSinglePlaylist)
    expect(result.items).toHaveLength(1)
  })

  it('should handle playlists without images', async () => {
    const accessToken = 'test-access-token'
    const mockPlaylistsWithoutImages = {
      items: [
        {
          id: 'playlist1',
          name: 'Playlist Without Images',
          description: 'A playlist without images',
          images: [],
          owner: {
            display_name: 'Test User'
          },
          tracks: {
            total: 0
          }
        }
      ],
      total: 1,
      limit: 14,
      offset: 0
    }

    mockGot.mockResolvedValue({ body: mockPlaylistsWithoutImages })

    const result = await getPlaylists(accessToken)

    expect(result).toEqual(mockPlaylistsWithoutImages)
    expect(result.items[0].images).toEqual([])
  })

  it('should handle malformed response', async () => {
    const accessToken = 'test-access-token'
    const mockMalformedResponse = {
      // Missing expected properties
      error: 'Something went wrong'
    }

    mockGot.mockResolvedValue({ body: mockMalformedResponse })

    const result = await getPlaylists(accessToken)

    // Should return the malformed response as-is
    expect(result).toEqual(mockMalformedResponse)
  })
}) 