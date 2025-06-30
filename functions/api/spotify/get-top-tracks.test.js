import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import getTopTracks from './get-top-tracks.js'

// Mock dependencies
vi.mock('requestretry', () => ({
  default: vi.fn()
}))

describe('getTopTracks', () => {
  let mockRequest

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock function
    const requestretry = await import('requestretry')
    mockRequest = requestretry.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully get top tracks with valid access token', async () => {
    const accessToken = 'test-access-token'
    const mockTopTracks = {
      items: [
        {
          id: 'track1',
          name: 'Test Track 1',
          artists: [{ name: 'Artist 1' }],
          album: { name: 'Album 1' },
          uri: 'spotify:track:track1'
        },
        {
          id: 'track2',
          name: 'Test Track 2',
          artists: [{ name: 'Artist 2' }],
          album: { name: 'Album 2' },
          uri: 'spotify:track:track2'
        }
      ]
    }

    mockRequest.mockResolvedValue(mockTopTracks)

    const result = await getTopTracks(accessToken)

    // Verify request was called with correct parameters
    expect(mockRequest).toHaveBeenCalledWith({
      fullResponse: false,
      headers: { Authorization: 'Bearer test-access-token' },
      json: true,
      qs: {
        time_range: 'short_term',
        limit: 12
      },
      retryStrategy: expect.any(Function),
      uri: 'https://api.spotify.com/v1/me/top/tracks'
    })

    // Verify retry strategy function
    const retryStrategy = mockRequest.mock.calls[0][0].retryStrategy
    expect(retryStrategy(new Error('Network error'))).toBe(true)
    expect(retryStrategy(null)).toBe(false)

    // Verify result
    expect(result).toEqual(mockTopTracks.items)
  })

  it('should throw error when no items are returned', async () => {
    const accessToken = 'test-access-token'
    const mockEmptyResponse = {
      items: []
    }

    mockRequest.mockResolvedValue(mockEmptyResponse)

    await expect(getTopTracks(accessToken)).rejects.toThrow('No top tracks returned from Spotify.')
  })

  it('should throw error when items property is missing', async () => {
    const accessToken = 'test-access-token'
    const mockResponseWithoutItems = {
      // Missing items property
    }

    mockRequest.mockResolvedValue(mockResponseWithoutItems)

    await expect(getTopTracks(accessToken)).rejects.toThrow('No top tracks returned from Spotify.')
  })

  it('should throw error when items is null', async () => {
    const accessToken = 'test-access-token'
    const mockResponseWithNullItems = {
      items: null
    }

    mockRequest.mockResolvedValue(mockResponseWithNullItems)

    await expect(getTopTracks(accessToken)).rejects.toThrow('No top tracks returned from Spotify.')
  })

  it('should throw error when items is undefined', async () => {
    const accessToken = 'test-access-token'
    const mockResponseWithUndefinedItems = {
      items: undefined
    }

    mockRequest.mockResolvedValue(mockResponseWithUndefinedItems)

    await expect(getTopTracks(accessToken)).rejects.toThrow('No top tracks returned from Spotify.')
  })

  it('should handle request errors', async () => {
    const accessToken = 'invalid-access-token'
    const mockError = new Error('Unauthorized')

    mockRequest.mockRejectedValue(mockError)

    await expect(getTopTracks(accessToken)).rejects.toThrow('Unauthorized')
  })

  it('should handle single track response', async () => {
    const accessToken = 'test-access-token'
    const mockSingleTrack = {
      items: [
        {
          id: 'track1',
          name: 'Single Track',
          artists: [{ name: 'Artist 1' }],
          album: { name: 'Album 1' },
          uri: 'spotify:track:track1'
        }
      ]
    }

    mockRequest.mockResolvedValue(mockSingleTrack)

    const result = await getTopTracks(accessToken)

    expect(result).toEqual(mockSingleTrack.items)
    expect(result).toHaveLength(1)
  })
}) 