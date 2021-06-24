const admin = require('firebase-admin')
const { config: getConfig, logger } = require('firebase-functions')

const getOwnedGames = require('../api/steam/get-owned-games')
const getPlayerSummary = require('../api/steam/get-player-summary')
const getRecentlyPlayedGames = require('../api/steam/get-recently-played-games')

const { selectSteamAPIKey, selectSteamUserId } = require('../selectors/config')

const {
  providers: { STEAM } = {},
  responses: { SUCCESS, FAILURE } = {},
} = require('../constants')

const buildImage = (appId, hashId) =>
  `http://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hashId}.jpg`

const transformSteamGame = game => {
  const {
    appid: id,
    img_icon_url: iconHash,
    img_logo_url: logoHash,
    name: displayName,
    playtime_2weeks: playTime2Weeks,
    playtime_forever: playTimeForever,
  } = game

  const iconURL = buildImage(id, iconHash)
  const logoURL = buildImage(id, logoHash)

  return {
    displayName,
    iconURL,
    id,
    logoURL,
    playTime2Weeks,
    playTimeForever,
  }
}

const syncSteamData = async () => {
  const config = getConfig()

  const apiKey = selectSteamAPIKey(config)
  const userId = selectSteamUserId(config)

  const [recentlyPlayedGames, ownedGames, playerSummary] = await Promise.all([
    getRecentlyPlayedGames(apiKey, userId),
    getOwnedGames(apiKey, userId),
    getPlayerSummary(apiKey, userId),
  ])

  const { game_count: ownedGameCount = 0 } = ownedGames
  const {
    avatarfull: avatarURL,
    profileurl: profileURL,
    personaname: displayName,
  } = playerSummary

  const widgetContent = {
    collections: {
      recentlyPlayedGames: recentlyPlayedGames.map(game =>
        transformSteamGame(game)
      ),
    },
    meta: {
      synced: admin.firestore.FieldValue.serverTimestamp(),
    },
    metrics: [
      ...(ownedGameCount
        ? [
            {
              displayName: 'Owned Games',
              id: 'owned-games-count',
              value: ownedGameCount,
            },
          ]
        : []),
    ],
    profile: {
      avatarURL,
      displayName,
      profileURL,
    },
  }

  try {
    const db = admin.firestore()
    await await db.collection(STEAM).doc('widget-content').set(widgetContent)
  } catch (err) {
    logger.error('Failed to save Steam data to database.', err)
    return {
      result: FAILURE,
      error: err.message || err,
    }
  }

  return {
    result: SUCCESS,
    data: widgetContent,
  }
}

module.exports = syncSteamData
