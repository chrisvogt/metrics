const admin = require('firebase-admin')
const functions = require('firebase-functions')

const getSpotifyAccessToken = require('../api/spotify/get-access-token')
const getSpotifyTopTracks = require('../api/spotify/get-top-tracks')
const getSpotifyUserProfile = require('../api/spotify/get-user-profile')
const transformTrackToCollectionItem = require('../transformers/track-to-collection-item')

const { DATABASE_COLLECTION_SPOTIFY } = require('../constants')

const syncSpotifyTopTracks = async () => {
  const config = functions.config()

  const {
    spotify: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    } = {},
  } = config

  let accessToken
  try {
    const [accessTokenObj, accessTokenError] = await getSpotifyAccessToken({
      clientId,
      clientSecret,
      refreshToken,
    })

    if (accessTokenError || !(accessTokenObj || {}).accessToken) {
      throw (
        accessTokenError || new Error('Failed to get the Spotify access token.')
      )
    }

    accessToken = accessTokenObj.accessToken
  } catch (err) {
    console.error('Failed to get the Spotify access token', err)
  }

  if (!accessToken) {
    return {
      result: 'FAILURE',
      error: 'Need a valid access token to call Spotify API.',
    }
  }

  let userProfile
  try {
    const spotifyUserProfile = await getSpotifyUserProfile(accessToken)
    userProfile = spotifyUserProfile
  } catch (err) {
    console.error('Failed to fetch the spotify user profile', err)
    return {
      result: 'FAILURE',
      error: err,
    }
  }

  let topTracks
  try {
    const topTracksResult = await getSpotifyTopTracks(accessToken)
    topTracks = topTracksResult
  } catch (err) {
    console.error('Failed to fetch and save Spotify top tracks.', err)
    return {
      result: 'FAILURE',
      error: err,
    }
  }

  const db = admin.firestore()

  const saveTopTracksResponse = async () => {
    return await db
      .collection(DATABASE_COLLECTION_SPOTIFY)
      .doc('last-response_top-tracks')
      .set({
        response: topTracks,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
  }

  const saveUserProfileResponse = async () => {
    return await db
      .collection(DATABASE_COLLECTION_SPOTIFY)
      .doc('last-response_user-profile')
      .set({
        response: userProfile,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
  }

  const saveWidgetContent = async () => {
    const {
      display_name: displayName,
      external_urls: { spotify: profileURL } = {},
      followers: { total: followersCount } = {},
      id,
      images,
    } = userProfile

    const avatarURL = images.find(({ url }) => !!url)

    // TODO(chrisvogt): replace with synced data
    const playlistsCount = 52

    return await db
      .collection(DATABASE_COLLECTION_SPOTIFY)
      .doc('widget-content')
      .set({
        collections: {
          topTracks: topTracks.map(transformTrackToCollectionItem),
        },
        meta: {
          synced: admin.firestore.FieldValue.serverTimestamp(),
        },
        metrics: [
          ...(followersCount
            ? [
                {
                  displayName: 'Followers',
                  id: 'followers-count',
                  value: followersCount,
                },
              ]
            : []),
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
          profileURL
        },
      })
  }

  try {
    const saveResult = await Promise.all(
      [saveTopTracksResponse()],
      [saveUserProfileResponse()],
      [saveWidgetContent()]
    )

    return {
      result: 'SUCCESS',
      totalSyncedCount: topTracks.length,
    }
  } catch (err) {
    console.error('Failed to save Spotify data to db.', err)
    return {
      result: 'FAILURE',
      error: err,
    }
  }
}

module.exports = syncSpotifyTopTracks
