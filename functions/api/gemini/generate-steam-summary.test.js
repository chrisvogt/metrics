import { describe, it, expect, vi, beforeEach } from 'vitest'
import generateSteamSummary from './generate-steam-summary.js'

// Mock the GoogleGenerativeAI (use function so it's a constructor)
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function () {
    return {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: vi.fn().mockReturnValue(
              '```json\n{"response": "Mock AI summary of gaming activity", "debug": {"recentlyPlayedGames": [], "topPlayedGames": []}}\n```'
            )
          }
        })
      })
    }
  })
}))

describe('generateSteamSummary', () => {
  const mockSteamData = {
    collections: {
      recentlyPlayedGames: [
        {
          displayName: 'Cyberpunk 2077',
          playTime2Weeks: 120,
          playTimeForever: 500
        },
        {
          displayName: 'Elden Ring',
          playTime2Weeks: 90,
          playTimeForever: 300
        }
      ],
      ownedGames: [
        {
          displayName: 'Cyberpunk 2077',
          playTimeForever: 500
        },
        {
          displayName: 'Elden Ring',
          playTimeForever: 300
        },
        {
          displayName: 'Witcher 3',
          playTimeForever: 800
        }
      ]
    },
    profile: {
      displayName: 'TestGamer'
    },
    metrics: [
      {
        id: 'owned-games-count',
        value: 50
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  it('should generate a summary when valid data is provided', async () => {
    const result = await generateSteamSummary(mockSteamData)
    
    expect(result).toBe('Mock AI summary of gaming activity')
  })

  it('should throw error when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY
    
    await expect(generateSteamSummary(mockSteamData))
      .rejects
      .toThrow('GEMINI_API_KEY environment variable is required')
  })

  it('should handle empty collections gracefully', async () => {
    const emptyData = {
      collections: {
        recentlyPlayedGames: [],
        ownedGames: []
      },
      profile: {
        displayName: 'TestGamer'
      },
      metrics: []
    }

    const result = await generateSteamSummary(emptyData)
    
    expect(result).toBe('Mock AI summary of gaming activity')
  })
})
