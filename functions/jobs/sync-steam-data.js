const admin = require('firebase-admin')
const { logger } = require('firebase-functions')
const { Timestamp } = require('firebase-admin/firestore')

const getOwnedGames = require('../api/steam/get-owned-games')
const getPlayerSummary = require('../api/steam/get-player-summary')
const getRecentlyPlayedGames = require('../api/steam/get-recently-played-games')

const { DATABASE_COLLECTION_STEAM } = require('../constants')

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
      icon: iconHash ? `http://media.steampowered.com/steamcommunity/public/images/apps/${id}/${iconHash}.jpg` : '',
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
const syncSteamData = async () => {
  const apiKey = process.env.STEAM_API_KEY
  const userId = process.env.STEAM_USER_ID

  const [recentlyPlayedGames, ownedGames, playerSummary] = await Promise.all([
    getRecentlyPlayedGames(apiKey, userId),
    getOwnedGames(apiKey, userId),
    getPlayerSummary(apiKey, userId),
  ])

  const db = admin.firestore()

  const saveOwnedGames = async () => await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('last-response_owned-games')
    .set({
      response: ownedGames,
      fetchedAt: Timestamp.now(),
    })

  const savePlayerSummary = async () => await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('last-response_player-summary')
    .set({
      response: playerSummary,
      fetchedAt: Timestamp.now(),
    })

  const saveRecentlyPlayedGames = async () => await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('last-response_recently-played-games')
    .set({
      response: recentlyPlayedGames,
      fetchedAt: Timestamp.now(),
    })

  const { game_count: ownedGameCount = 0 } = ownedGames
  const {
    avatarfull: avatarURL,
    profileurl: profileURL,
    personaname: displayName,
  } = playerSummary

  const widgetContent = {
    collections: {
      ownedGames: ownedGames.games
        .map(game => transformSteamGame(game))
        .filter(game => game.playTimeForever >= 100)
        .sort((a, b) => b.playTimeForever - a.playTimeForever),
      recentlyPlayedGames: recentlyPlayedGames.map(game => transformSteamGame(game))
    },
    meta: {
      synced: Timestamp.now(),
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

  const saveWidgetContent = async () => await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('widget-content')
    .set(widgetContent)

  try {
    await Promise.all([
      saveOwnedGames(),
      savePlayerSummary(),
      saveRecentlyPlayedGames(),
      saveWidgetContent(),
    ])
    return {
      result: 'SUCCESS',
      data: widgetContent,
    }
  } catch (err) {
    logger.error('Failed to save Steam data to database.', err)
    return {
      result: 'FAILURE',
      error: err.message || err,
    }
  }
}

module.exports = syncSteamData
