import type { DocumentStore } from '../ports/document-store.js'
import type {
  SteamApiGame,
  SteamOwnedGamesResponse,
  SteamSummaryInput,
} from '../types/steam.js'
import { isSteamPlayerSummary } from '../types/steam.js'
import type { SteamWidgetDocument } from '../types/widget-content.js'
import type { SyncJobResult } from '../types/sync-job.js'
import type { SyncJobExecutionOptions } from '../types/sync-pipeline.js'
import { getLogger } from '../services/logger.js'
import { toStoredDateTime } from '../utils/time.js'

import getOwnedGames from '../api/steam/get-owned-games.js'
import getPlayerSummary from '../api/steam/get-player-summary.js'
import getRecentlyPlayedGames from '../api/steam/get-recently-played-games.js'
import generateSteamSummary from '../api/gemini/generate-steam-summary.js'

import { getDefaultWidgetUserId, toProviderCollectionPath } from '../config/backend-paths.js'
import { getSteamConfig } from '../config/backend-config.js'
import { loadSteamAuthForUser } from '../services/steam-integration-credentials.js'

const transformSteamGame = (game: SteamApiGame) => {
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
  {
    userId: targetUserId = getDefaultWidgetUserId(),
    integrationLookupUserId: integrationLookupUserIdOpt,
    onProgress,
  }: SyncJobExecutionOptions = {}
): Promise<SyncJobResult<SteamWidgetDocument, { steamAuthMode?: 'env' | 'oauth' }>> => {
  const logger = getLogger()
  const { apiKey, userId: envSteamId } = getSteamConfig()
  const integrationLookupUserId = integrationLookupUserIdOpt ?? targetUserId

  let steamId = envSteamId ?? ''
  let steamAuthMode: 'env' | 'oauth' = 'env'
  const oauth = await loadSteamAuthForUser(documentStore, integrationLookupUserId)
  if (oauth) {
    steamId = oauth.steamId
    steamAuthMode = 'oauth'
  }

  if (!apiKey?.trim() || !steamId?.trim()) {
    logger.error('Steam sync: missing STEAM_API_KEY or Steam user id (env or OAuth).')
    return {
      result: 'FAILURE',
      error: 'Steam is not configured (API key and Steam account).',
    }
  }

  onProgress?.({
    phase: 'steam.auth',
    message:
      steamAuthMode === 'oauth'
        ? 'Using your linked Steam account (OAuth).'
        : 'Using server Steam credentials (legacy).',
  })

  const steamCollectionPath = toProviderCollectionPath('steam', targetUserId)

  onProgress?.({
    phase: 'steam.api',
    message: 'Loading your Steam profile, library, and recently played games.',
  })
  const [recentlyPlayedGames, ownedGames, playerSummary] = await Promise.all([
    getRecentlyPlayedGames(apiKey, steamId),
    getOwnedGames(apiKey, steamId),
    getPlayerSummary(apiKey, steamId),
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

  const ownedGamesObj: SteamOwnedGamesResponse = ownedGames
  const { game_count: ownedGameCount = 0 } = ownedGamesObj
  let avatarURL: string | undefined
  let profileURL: string | undefined
  let displayName: string | undefined
  if (isSteamPlayerSummary(playerSummary)) {
    avatarURL = playerSummary.avatarfull
    profileURL = playerSummary.profileurl
    displayName = playerSummary.personaname
  }

  const widgetContent: SteamWidgetDocument = {
    collections: {
      ownedGames: (ownedGamesObj.games ?? [])
        .map((game) => transformSteamGame(game))
        .filter((game) => (game.playTimeForever ?? 0) >= 100)
        .sort((a, b) => (b.playTimeForever ?? 0) - (a.playTimeForever ?? 0)),
      recentlyPlayedGames: recentlyPlayedGames.map((game) => transformSteamGame(game)),
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
  let aiSummary: string | null = null
  try {
    onProgress?.({
      phase: 'steam.ai',
      message: 'Generating Steam play-summary (AI).',
    })
    const summaryInput: SteamSummaryInput = {
      collections: widgetContent.collections!,
      metrics: widgetContent.metrics!,
      profile: widgetContent.profile!,
    }
    aiSummary = await generateSteamSummary(summaryInput)
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
    onProgress?.({
      phase: 'steam.persist',
      message: 'Saving Steam library, recents, and widget data to storage.',
    })
    await Promise.all([
      saveOwnedGames(),
      savePlayerSummary(),
      saveRecentlyPlayedGames(),
      saveWidgetContent(),
      saveAISummary(),
    ])
    return {
      data: widgetContent,
      result: 'SUCCESS',
      steamAuthMode,
    }
  } catch (err: unknown) {
    logger.error('Failed to save Steam data to database.', err)
    return {
      result: 'FAILURE',
      error: err instanceof Error ? err.message : err,
    }
  }
}

export default syncSteamData
