import { describe, it, expect, vi, beforeEach } from 'vitest'
import getRecentlyPlayedGames from './get-recently-played-games.js'

// Mock got
vi.mock('got', () => ({
  default: vi.fn()
}))

import got from 'got'

describe('getRecentlyPlayedGames', () => {
  const mockApiKey = 'test-api-key'
  const mockUserId = '123456789'

  const mockResponse = {
    body: {
      response: {
        total_count: 2,
        games: [
          {
            appid: 123456,
            name: 'Test Game 1',
            playtime_2weeks: 120,
            playtime_forever: 300,
            img_icon_url: 'test1.jpg',
            img_logo_url: 'test1_logo.jpg'
          },
          {
            appid: 789012,
            name: 'Test Game 2',
            playtime_2weeks: 60,
            playtime_forever: 150,
            img_icon_url: 'test2.jpg',
            img_logo_url: 'test2_logo.jpg'
          }
        ]
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch recently played games successfully', async () => {
    got.mockResolvedValue(mockResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, mockUserId)

    expect(got).toHaveBeenCalledWith(
      'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/',
      {
        responseType: 'json',
        searchParams: {
          key: mockApiKey,
          steamid: mockUserId
        }
      }
    )

    expect(result).toEqual(mockResponse.body.response.games)
  })

  it('should handle empty response gracefully', async () => {
    const emptyResponse = {
      body: {
        response: {}
      }
    }

    got.mockResolvedValue(emptyResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, mockUserId)

    expect(result).toEqual([])
  })

  it('should handle response with no games', async () => {
    const noGamesResponse = {
      body: {
        response: {
          total_count: 0,
          games: []
        }
      }
    }

    got.mockResolvedValue(noGamesResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, mockUserId)

    expect(result).toEqual([])
  })

  it('should handle malformed response body', async () => {
    const malformedResponse = {
      body: null
    }

    got.mockResolvedValue(malformedResponse)

    await expect(getRecentlyPlayedGames(mockApiKey, mockUserId)).rejects.toThrow()
  })

  it('should handle API errors', async () => {
    const error = new Error('Steam API error')
    got.mockRejectedValue(error)

    await expect(getRecentlyPlayedGames(mockApiKey, mockUserId)).rejects.toThrow('Steam API error')
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network timeout')
    got.mockRejectedValue(networkError)

    await expect(getRecentlyPlayedGames(mockApiKey, mockUserId)).rejects.toThrow('Network timeout')
  })

  it('should handle invalid API key', async () => {
    const invalidKeyResponse = {
      body: {
        response: {
          games: []
        }
      }
    }

    got.mockResolvedValue(invalidKeyResponse)

    const result = await getRecentlyPlayedGames('invalid-key', mockUserId)

    expect(result).toEqual([])
  })

  it('should handle invalid user ID', async () => {
    const invalidUserResponse = {
      body: {
        response: {
          games: []
        }
      }
    }

    got.mockResolvedValue(invalidUserResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, 'invalid-user-id')

    expect(result).toEqual([])
  })

  it('should handle games with no playtime in 2 weeks', async () => {
    const noRecentPlaytimeResponse = {
      body: {
        response: {
          total_count: 1,
          games: [
            {
              appid: 123456,
              name: 'Test Game 1',
              playtime_2weeks: 0,
              playtime_forever: 500,
              img_icon_url: 'test1.jpg',
              img_logo_url: 'test1_logo.jpg'
            }
          ]
        }
      }
    }

    got.mockResolvedValue(noRecentPlaytimeResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, mockUserId)

    expect(result[0].playtime_2weeks).toBe(0)
    expect(result[0].playtime_forever).toBe(500)
  })

  it('should handle games with missing image URLs', async () => {
    const missingImagesResponse = {
      body: {
        response: {
          total_count: 1,
          games: [
            {
              appid: 123456,
              name: 'Test Game 1',
              playtime_2weeks: 120,
              playtime_forever: 300
              // Missing img_icon_url and img_logo_url
            }
          ]
        }
      }
    }

    got.mockResolvedValue(missingImagesResponse)

    const result = await getRecentlyPlayedGames(mockApiKey, mockUserId)

    expect(result[0]).not.toHaveProperty('img_icon_url')
    expect(result[0]).not.toHaveProperty('img_logo_url')
  })
})
