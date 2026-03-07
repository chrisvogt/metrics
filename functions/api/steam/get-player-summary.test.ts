import { describe, it, expect, vi, beforeEach } from 'vitest'
import getPlayerSummary from './get-player-summary.js'

// Mock got
vi.mock('got', () => ({
  default: vi.fn()
}))

import got from 'got'

describe('getPlayerSummary', () => {
  const mockApiKey = 'test-api-key'
  const mockUserId = '123456789'

  const mockResponse = {
    body: {
      response: {
        players: [
          {
            steamid: '123456789',
            personaname: 'TestPlayer',
            profileurl: 'https://steamcommunity.com/id/testplayer',
            avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/test.jpg',
            avatarmedium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/test_medium.jpg',
            avatarfull: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/test_full.jpg',
            personastate: 1,
            communityvisibilitystate: 3,
            profilestate: 1,
            lastlogoff: 1640995200,
            commentpermission: 2,
            realname: 'Test User',
            primaryclanid: '123456',
            timecreated: 1234567890,
            gameid: '0',
            gameserverip: '',
            gameextrainfo: '',
            clanstate: 0,
            countrycode: 'US',
            loccountrycode: 'US',
            locstatecode: 'CA',
            loccityid: 12345
          }
        ]
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch player summary successfully', async () => {
    got.mockResolvedValue(mockResponse)

    const result = await getPlayerSummary(mockApiKey, mockUserId)

    expect(got).toHaveBeenCalledWith(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
      {
        responseType: 'json',
        searchParams: {
          key: mockApiKey,
          steamids: mockUserId
        }
      }
    )

    expect(result).toEqual(mockResponse.body.response.players[0])
  })

  it('should handle empty response gracefully', async () => {
    const emptyResponse = {
      body: {
        response: {
          players: []
        }
      }
    }

    got.mockResolvedValue(emptyResponse)

    const result = await getPlayerSummary(mockApiKey, mockUserId)

    expect(result).toEqual([])
  })

  it('should handle response with no players', async () => {
    const noPlayersResponse = {
      body: {
        response: {
          players: []
        }
      }
    }

    got.mockResolvedValue(noPlayersResponse)

    const result = await getPlayerSummary(mockApiKey, mockUserId)

    expect(result).toEqual([])
  })

  it('should handle malformed response body', async () => {
    const malformedResponse = {
      body: null
    }

    got.mockResolvedValue(malformedResponse)

    await expect(getPlayerSummary(mockApiKey, mockUserId)).rejects.toThrow()
  })

  it('should handle API errors', async () => {
    const error = new Error('Steam API error')
    got.mockRejectedValue(error)

    await expect(getPlayerSummary(mockApiKey, mockUserId)).rejects.toThrow('Steam API error')
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network timeout')
    got.mockRejectedValue(networkError)

    await expect(getPlayerSummary(mockApiKey, mockUserId)).rejects.toThrow('Network timeout')
  })

  it('should handle invalid API key', async () => {
    const invalidKeyResponse = {
      body: {
        response: {
          players: []
        }
      }
    }

    got.mockResolvedValue(invalidKeyResponse)

    const result = await getPlayerSummary('invalid-key', mockUserId)

    expect(result).toEqual([])
  })

  it('should handle invalid user ID', async () => {
    const invalidUserResponse = {
      body: {
        response: {
          players: []
        }
      }
    }

    got.mockResolvedValue(invalidUserResponse)

    const result = await getPlayerSummary(mockApiKey, 'invalid-user-id')

    expect(result).toEqual([])
  })

  it('should handle private profile', async () => {
    const privateProfileResponse = {
      body: {
        response: {
          players: [
            {
              steamid: '123456789',
              personaname: 'PrivatePlayer',
              communityvisibilitystate: 1, // Private
              profilestate: 0
            }
          ]
        }
      }
    }

    got.mockResolvedValue(privateProfileResponse)

    const result = await getPlayerSummary(mockApiKey, mockUserId)

    expect(result.communityvisibilitystate).toBe(1)
    expect(result.profilestate).toBe(0)
  })
})
