import { describe, it, expect, vi, beforeEach } from 'vitest'
import getOwnedGames from './get-owned-games.js'

// Mock got
vi.mock('got', () => ({
  default: vi.fn()
}))

import got from 'got'

describe('getOwnedGames', () => {
  const mockApiKey = 'test-api-key'
  const mockUserId = '123456789'

  const mockResponse = {
    body: {
      response: {
        game_count: 2,
        games: [
          {
            appid: 123456,
            name: 'Test Game 1',
            playtime_forever: 120,
            img_icon_url: 'test1.jpg'
          },
          {
            appid: 789012,
            name: 'Test Game 2',
            playtime_forever: 300,
            img_icon_url: 'test2.jpg'
          }
        ]
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch owned games successfully', async () => {
    got.mockResolvedValue(mockResponse)

    const result = await getOwnedGames(mockApiKey, mockUserId)

    expect(got).toHaveBeenCalledWith(
      'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/',
      {
        responseType: 'json',
        searchParams: {
          key: mockApiKey,
          steamid: mockUserId,
          include_appinfo: true
        }
      }
    )

    expect(result).toEqual(mockResponse.body.response)
  })

  it('should handle empty response gracefully', async () => {
    const emptyResponse = {
      body: {
        response: {}
      }
    }

    got.mockResolvedValue(emptyResponse)

    const result = await getOwnedGames(mockApiKey, mockUserId)

    expect(result).toEqual({})
  })

  it('should handle response with no games', async () => {
    const noGamesResponse = {
      body: {
        response: {
          game_count: 0,
          games: []
        }
      }
    }

    got.mockResolvedValue(noGamesResponse)

    const result = await getOwnedGames(mockApiKey, mockUserId)

    expect(result).toEqual({
      game_count: 0,
      games: []
    })
  })

  it('should handle malformed response body', async () => {
    const malformedResponse = {
      body: null
    }

    got.mockResolvedValue(malformedResponse)

    await expect(getOwnedGames(mockApiKey, mockUserId)).rejects.toThrow()
  })

  it('should handle API errors', async () => {
    const error = new Error('Steam API error')
    got.mockRejectedValue(error)

    await expect(getOwnedGames(mockApiKey, mockUserId)).rejects.toThrow('Steam API error')
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network timeout')
    got.mockRejectedValue(networkError)

    await expect(getOwnedGames(mockApiKey, mockUserId)).rejects.toThrow('Network timeout')
  })

  it('should handle invalid API key', async () => {
    const invalidKeyResponse = {
      body: {
        response: {
          error: 'Invalid API key'
        }
      }
    }

    got.mockResolvedValue(invalidKeyResponse)

    const result = await getOwnedGames('invalid-key', mockUserId)

    expect(result).toEqual({
      error: 'Invalid API key'
    })
  })

  it('should handle invalid user ID', async () => {
    const invalidUserResponse = {
      body: {
        response: {
          error: 'Invalid Steam ID'
        }
      }
    }

    got.mockResolvedValue(invalidUserResponse)

    const result = await getOwnedGames(mockApiKey, 'invalid-user-id')

    expect(result).toEqual({
      error: 'Invalid Steam ID'
    })
  })
})
