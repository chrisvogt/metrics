import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobResult } from '../types/sync-job.js'
import type { WidgetDataSource } from '../types/widget-content.js'
import { getLogger } from '../services/logger.js'
import { toStoredDateTime } from '../utils/time.js'

import getOwnedGames from '../api/steam/get-owned-games.js'
import getPlayerSummary from '../api/steam/get-player-summary.js'
import getRecentlyPlayedGames from '../api/steam/get-recently-played-games.js'
import generateSteamSummary from '../api/gemini/generate-steam-summary.js'

import { getDefaultWidgetUserId, toProviderCollectionPath } from '../config/backend-paths.js'
import { getSteamConfig } from '../config/backend-config.js'

interface SyncSteamDataOptions {
  source?: WidgetDataSource
  userId?: string
}

const transformSteamGame = (game) => {
  const {
    appid: id,
    img_icon_url: iconHash,
    name: displayName,
    playtime_2weeks: playTime2Weeks,
    playtime_forever: playTimeForever,
  } = game

  return {
    displayName,
    id,
    images: {
      capsuleLarge: `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_616x353.jpg`,
      capsuleSmall: `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/capsule_231x87.jpg`,
      icon: iconHash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${id}/${iconHash}.jpg` : '',
      header: `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
      heroCapsule: `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/hero_capsule.jpg`
    },
    playTime2Weeks,
    playTimeForever,
  }
}

/**
 * Sync Steam Data
 * 
 * To Do:
 * 
 * - [ ] Handle images
 * 
 * https://cdn.cloudflare.steamstatic.com/steam/apps/{steamId}/{fileName}.jpg 
 * Example: https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_231x87.jpg
 *
 * Available files:
 *
 *  - hero_capsule.jpg
 *  - capsule_616x353.jpg
 *  - header.jpg
 *  - capsule_231x87.jpg
 */
const syncSteamData = async (
  documentStore: DocumentStore,
  { source: _source = 'live', userId: targetUserId = getDefaultWidgetUserId() }: SyncSteamDataOptions = {}
): Promise<SyncJobResult<Record<string, unknown>>> => {
  const logger = getLogger()
  const { apiKey, userId } = getSteamConfig()
  const steamCollectionPath = toProviderCollectionPath('steam', targetUserId)

  const [recentlyPlayedGames, ownedGames, playerSummary] = await Promise.all([
    getRecentlyPlayedGames(apiKey, userId),
    getOwnedGames(apiKey, userId),
    getPlayerSummary(apiKey, userId),
  ])

  const saveOwnedGames = async () => await documentStore.setDocument(
    `${steamCollectionPath}/last-response_owned-games`,
    {
      response: ownedGames,
      fetchedAt: toStoredDateTime(),
    }
  )

  const savePlayerSummary = async () => await documentStore.setDocument(
    `${steamCollectionPath}/last-response_player-summary`,
    {
      response: playerSummary,
      fetchedAt: toStoredDateTime(),
    }
  )

  const saveRecentlyPlayedGames = async () => await documentStore.setDocument(
    `${steamCollectionPath}/last-response_recently-played-games`,
    {
      response: recentlyPlayedGames,
      fetchedAt: toStoredDateTime(),
    }
  )

  const ownedGamesObj = ownedGames as { game_count?: number; games?: unknown[] }
  const playerSummaryObj = playerSummary as { avatarfull?: string; profileurl?: string; personaname?: string }
  const { game_count: ownedGameCount = 0 } = ownedGamesObj
  const {
    avatarfull: avatarURL,
    profileurl: profileURL,
    personaname: displayName,
  } = playerSummaryObj

  const widgetContent: Record<string, unknown> = {
    collections: {
      ownedGames: (ownedGamesObj.games ?? [])
        .map((game: unknown) => transformSteamGame(game))
        .filter((game: { playTimeForever?: number }) => (game.playTimeForever ?? 0) >= 100)
        .sort((a: { playTimeForever?: number }, b: { playTimeForever?: number }) => (b.playTimeForever ?? 0) - (a.playTimeForever ?? 0)),
      recentlyPlayedGames: (recentlyPlayedGames as unknown[]).map((game: unknown) => transformSteamGame(game)),
    },
    meta: {
      synced: toStoredDateTime(),
    },
    metrics: [
      ...(ownedGameCount
        ? [
          {
            displayName: 'Owned Games',
            id: 'owned-games-count',
            value: ownedGameCount,
          },
        ] : []
      ),
    ],
    profile: {
      avatarURL,
      displayName,
      profileURL,
    },
  }

  // Generate AI summary using Gemini
  let aiSummary: unknown = null
  try {
    aiSummary = await generateSteamSummary(widgetContent)
    widgetContent.aiSummary = aiSummary
  } catch (error) {
    logger.error('Failed to generate AI summary:', error)
    // Continue with sync even if AI summary fails
  }

  const saveWidgetContent = async () =>
    await documentStore.setDocument(`${steamCollectionPath}/widget-content`, widgetContent)

  const saveAISummary = async () => {
    if (aiSummary) {
      await documentStore.setDocument(`${steamCollectionPath}/last-response_ai-summary`, {
        summary: aiSummary,
        generatedAt: toStoredDateTime(),
      })
    }
  }

  try {
    await Promise.all([
      saveOwnedGames(),
      savePlayerSummary(),
      saveRecentlyPlayedGames(),
      saveWidgetContent(),
      saveAISummary(),
    ])
    return {
      result: 'SUCCESS',
      data: widgetContent
    }
  } catch (err) {
    logger.error('Failed to save Steam data to database.', err)
    return {
      result: 'FAILURE',
      error: err.message || err,
    }
  }
}

export default syncSteamData
