const admin = require('firebase-admin')
const { config: getConfig, logger } = require('firebase-functions')
const { Timestamp } = require('firebase-admin/firestore')

const getSpotifyAccessToken = require('../api/spotify/get-access-token')
const getSpotifyPlaylists = require('../api/spotify/get-playlists')
const getSpotifyTopTracks = require('../api/spotify/get-top-tracks')
const getSpotifyUserProfile = require('../api/spotify/get-user-profile')
const transformTrackToCollectionItem = require('../transformers/track-to-collection-item')

const {
  selectSpotifyClientId,
  selectSpotifyClientSecret,
  selectSpotifyRedirectURI,
  selectSpotifyRefreshToken
} = require('../selectors/config')

const { DATABASE_COLLECTION_SPOTIFY } = require('../constants')

const syncSpotifyTopTracks = async () => {
  const config = getConfig()

  const clientId = selectSpotifyClientId(config)
  const clientSecret = selectSpotifyClientSecret(config)
  const redirectURI = selectSpotifyRedirectURI(config)
  const refreshToken = selectSpotifyRefreshToken(config)

  const { accessToken } = await getSpotifyAccessToken({
    clientId,
    clientSecret,
    redirectURI,
    refreshToken
  })

  if (!accessToken) {
    return {
      result: 'FAILURE',
      error: 'Need a valid access token to call Spotify API.',
    }
  }

  let userProfile
  try {
    userProfile = await getSpotifyUserProfile(accessToken)
  } catch (error) {
    logger.error('Failed to fetch Spotify user profile.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }

  let topTracks
  try {
    topTracks = await getSpotifyTopTracks(accessToken)
  } catch (error) {
    logger.error('Failed to fetch Spotify top tracks.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }
    
  let playlists
  let playlistsCount
  let playlistsResponse
  try {
    playlistsResponse = await getSpotifyPlaylists(accessToken)
    playlists = playlistsResponse.items
    playlistsCount = playlistsResponse.total
  } catch (error) {
    logger.error('Failed to fetch Spotify playlists.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }

  const {
    display_name: displayName,
    external_urls: { spotify: profileURL } = {},
    followers: { total: followersCount } = {},
    id,
    images,
  } = userProfile

  const avatarURL = images.find(({ url }) => !!url)

  const widgetContent = {
    collections: {
      playlists,
      topTracks: topTracks.map(transformTrackToCollectionItem),
    },
    meta: {
      synced: Timestamp.now(),
    },
    metrics: [
      ...(followersCount
        ? [
          {
            displayName: 'Followers',
            id: 'followers-count',
            value: followersCount,
          },
        ] : []
      ),
      {
        displayName: 'Playlists',
        id: 'playlists-count',
        value: playlistsCount,
      },
    ],
    profile: {
      avatarURL,
      displayName,
      followersCount,
      id,
      profileURL,
    },
  }

  const db = admin.firestore()

  const savePlaylists = async () => await db
    .collection(DATABASE_COLLECTION_SPOTIFY)
    .doc('last-response_playlists')
    .set({
      response: playlistsResponse,
      fetchedAt: Timestamp.now(),
    })

  const saveTopTracksResponse = async () => await db
    .collection(DATABASE_COLLECTION_SPOTIFY)
    .doc('last-response_top-tracks')
    .set({
      response: topTracks,
      fetchedAt: Timestamp.now(),
    })

  const saveUserProfileResponse = async () => await db
    .collection(DATABASE_COLLECTION_SPOTIFY)
    .doc('last-response_user-profile')
    .set({
      response: userProfile,
      fetchedAt: Timestamp.now(),
    })

  const saveWidgetContent = async () => {
    return await db
      .collection(DATABASE_COLLECTION_SPOTIFY)
      .doc('widget-content')
      .set(widgetContent)
  }

  try {
    await Promise.all(
      [savePlaylists()],
      [saveTopTracksResponse()],
      [saveUserProfileResponse()],
      [saveWidgetContent()]
    )

    logger.info('Spotify sync finished successfully.', {
      tracksSyncedCount: topTracks.length
    })

    return {
      result: 'SUCCESS',
      tracksSyncedCount: topTracks.length,
      widgetContent
    }
  } catch (error) {
    logger.error('Failed to save Spotify data to db.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }
}

module.exports = syncSpotifyTopTracks
