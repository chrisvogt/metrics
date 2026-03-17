import { beforeEach, describe, expect, it, vi } from 'vitest'

import syncSteamData from './sync-steam-data.js'
import type { DocumentStore } from '../ports/document-store.js'
import { configureLogger } from '../services/logger.js'

vi.mock('../config/backend-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/backend-config.js')>()
  return {
    ...actual,
    getSteamConfig: vi.fn(() => ({
      apiKey: 'steam-api-key',
      userId: 'steam-user-id',
    })),
  }
})

vi.mock('../api/steam/get-owned-games.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/steam/get-player-summary.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/steam/get-recently-played-games.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/gemini/generate-steam-summary.js', () => ({
  default: vi.fn(),
}))

import getOwnedGames from '../api/steam/get-owned-games.js'
import getPlayerSummary from '../api/steam/get-player-summary.js'
import getRecentlyPlayedGames from '../api/steam/get-recently-played-games.js'
import generateSteamSummary from '../api/gemini/generate-steam-summary.js'

describe('syncSteamData', () => {
  let documentStore: DocumentStore
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configureLogger(logger)
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should successfully sync Steam data to the document store', async () => {
    vi.mocked(getRecentlyPlayedGames).mockResolvedValue([
      { appid: 10, name: 'Counter-Strike', playtime_2weeks: 30, playtime_forever: 400, img_icon_url: 'icon' },
    ])
    vi.mocked(getOwnedGames).mockResolvedValue({
      game_count: 1,
      games: [{ appid: 10, name: 'Counter-Strike', playtime_forever: 400, img_icon_url: 'icon' }],
    })
    vi.mocked(getPlayerSummary).mockResolvedValue({
      avatarfull: 'https://example.com/avatar.jpg',
      profileurl: 'https://steamcommunity.com/id/test',
      personaname: 'Steam User',
    })
    vi.mocked(generateSteamSummary).mockResolvedValue('Great recent activity')

    const result = await syncSteamData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/last-response_owned-games',
      expect.objectContaining({
        response: expect.any(Object),
        fetchedAt: expect.any(String),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/last-response_player-summary',
      expect.objectContaining({
        response: expect.any(Object),
        fetchedAt: expect.any(String),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/last-response_recently-played-games',
      expect.objectContaining({
        response: expect.any(Array),
        fetchedAt: expect.any(String),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/widget-content',
      expect.objectContaining({
        aiSummary: 'Great recent activity',
        meta: {
          synced: expect.any(String),
        },
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/last-response_ai-summary',
      expect.objectContaining({
        summary: 'Great recent activity',
        generatedAt: expect.any(String),
      })
    )
    expect(result.data.aiSummary).toBe('Great recent activity')
  })

  it('should continue when AI summary generation fails', async () => {
    vi.mocked(getRecentlyPlayedGames).mockResolvedValue([])
    vi.mocked(getOwnedGames).mockResolvedValue({ game_count: 0, games: [] })
    vi.mocked(getPlayerSummary).mockResolvedValue({})
    vi.mocked(generateSteamSummary).mockRejectedValue(new Error('AI Error'))

    const result = await syncSteamData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(documentStore.setDocument).toHaveBeenCalledTimes(4)
  })

  it('should fail when the document store rejects', async () => {
    vi.mocked(getRecentlyPlayedGames).mockResolvedValue([])
    vi.mocked(getOwnedGames).mockResolvedValue({ game_count: 0, games: [] })
    vi.mocked(getPlayerSummary).mockResolvedValue({})
    vi.mocked(generateSteamSummary).mockResolvedValue(null)
    vi.mocked(documentStore.setDocument).mockRejectedValue(new Error('DocumentStore Error'))

    const result = await syncSteamData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'DocumentStore Error',
    })
  })

  it('should sort and filter owned games before saving widget content', async () => {
    vi.mocked(getRecentlyPlayedGames).mockResolvedValue([])
    vi.mocked(getOwnedGames).mockResolvedValue({
      game_count: 3,
      games: [
        { appid: 1, name: 'Low Playtime', playtime_forever: 50, img_icon_url: 'icon-a' },
        { appid: 2, name: 'High Playtime', playtime_forever: 400, img_icon_url: 'icon-b' },
        { appid: 3, name: 'Mid Playtime', playtime_forever: 200, img_icon_url: 'icon-c' },
      ],
    })
    vi.mocked(getPlayerSummary).mockResolvedValue({})
    vi.mocked(generateSteamSummary).mockResolvedValue(null)

    await syncSteamData(documentStore)

    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam/widget-content',
      expect.objectContaining({
        collections: {
          ownedGames: [
            expect.objectContaining({ id: 2, displayName: 'High Playtime' }),
            expect.objectContaining({ id: 3, displayName: 'Mid Playtime' }),
          ],
          recentlyPlayedGames: [],
        },
      })
    )
  })
})
