import { describe, it, expect, vi, beforeEach } from 'vitest'
import generateSpotifySummary from './generate-spotify-summary.js'

// Mock the GoogleGenerativeAI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '```json\n{"response": "<p>Chris has been exploring music on Spotify.</p>", "debug": {}}\n```'
        }
      })
    })
  }))
}))

// Mock Firebase Functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

describe('generateSpotifySummary', () => {
  const mockSpotifyData = {
    collections: {
      topTracks: [
        {
          name: 'Test Track',
          artists: [{ name: 'Test Artist' }],
          album: { name: 'Test Album' },
          popularity: 85,
          explicit: false,
          duration_ms: 240000
        }
      ],
      playlists: [
        {
          name: 'My Playlist',
          description: 'Test playlist',
          public: true,
          collaborative: false,
          tracks: { total: 25 },
          owner: { display_name: 'Chris' }
        }
      ]
    },
    profile: {
      displayName: 'Chris',
      followersCount: 100,
      id: 'test_user',
      profileURL: 'https://spotify.com/user/test_user'
    },
    metrics: [
      {
        displayName: 'Playlists',
        id: 'playlists-count',
        value: 5
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  it('should generate a Spotify summary successfully', async () => {
    const result = await generateSpotifySummary(mockSpotifyData)

    expect(result).toContain('<p>')
    expect(result).toContain('Chris')
  })

  it('should throw error when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY

    await expect(generateSpotifySummary(mockSpotifyData)).rejects.toThrow(
      'GEMINI_API_KEY environment variable is required'
    )
  })

  it('should handle API errors gracefully', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockRejectedValue(new Error('API Error'))
      })
    }))

    await expect(generateSpotifySummary(mockSpotifyData)).rejects.toThrow(
      'Failed to generate AI summary: API Error'
    )
  })

  it('should handle missing collections gracefully', async () => {
    const incompleteData = {
      collections: {},
      profile: { displayName: 'Chris' },
      metrics: []
    }

    const result = await generateSpotifySummary(incompleteData)
    expect(result).toBeDefined()
  })
}) 