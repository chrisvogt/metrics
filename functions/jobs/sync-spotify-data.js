import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { Timestamp } from 'firebase-admin/firestore'
import pMap from 'p-map'

import fetchAndUploadFile from '../api/cloud-storage/fetch-and-upload-file.js'
import getSpotifyAccessToken from '../api/spotify/get-access-token.js'
import getSpotifyPlaylists from '../api/spotify/get-playlists.js'
import getSpotifyTopTracks from '../api/spotify/get-top-tracks.js'
import getSpotifyUserProfile from '../api/spotify/get-user-profile.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'
import transformTrackToCollectionItem from '../transformers/track-to-collection-item.js'
import generateSpotifySummary from '../api/gemini/generate-spotify-summary.js'

import {
  CLOUD_STORAGE_IMAGES_BUCKET,
  CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
  DATABASE_COLLECTION_SPOTIFY,
  IMAGE_CDN_BASE_URL
} from '../constants.js'

const SPOTIFY_MOSAIC_BASE_URL = 'https://mosaic.scdn.co/300/'

// Spotify playlists return 3 image sizes: 640x640, 300x300, and 60x60. I'm only interested in the 300x300 size.
const getMediaURLFromPlaylist = playlist => playlist.images?.find(playlist => playlist.height === 300 || playlist.width === 300)?.url

// Reducer to handle media filtering and transformation
const getMediaToDownloadReducer = (storedMediaFileNames = []) => (acc, playlist) => {
  const mediaURL = getMediaURLFromPlaylist(playlist)
  if (!mediaURL) {
    return acc
  }

  // I'm using the media filename — a hash — to identify the media file in GCP Storage because I assume the
  // images on mosaic.scdn.co rotate and change over time based on the playlist.
  const id = mediaURL.replace(SPOTIFY_MOSAIC_BASE_URL, '')
  const destinationPath = `${CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH}${id}.jpg`
  const isAlreadyDownloaded = storedMediaFileNames.includes(destinationPath)

  if (!isAlreadyDownloaded) {
    acc.push({
      destinationPath,
      id,
      mediaURL
    })
  }

  return acc
}

const transformPlaylists = (playlists) => playlists.map(playlist => {
  const id = getMediaURLFromPlaylist(playlist)?.replace(SPOTIFY_MOSAIC_BASE_URL, '')
  const cdnImageURL = `${IMAGE_CDN_BASE_URL}${CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH}${id}.jpg`
  return {
    ...playlist,
    cdnImageURL
  }
})

const syncSpotifyTopTracks = async () => {
  // In v2, we'll use environment variables directly instead of config()
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectURI = process.env.SPOTIFY_REDIRECT_URI
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN

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
    playlists = transformPlaylists(playlistsResponse.items)
    playlistsCount = playlistsResponse.total
  } catch (error) {
    logger.error('Failed to fetch Spotify playlists.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }

  const storedMediaFileNames = await listStoredMedia()

  const mediaToDownloadReducer = getMediaToDownloadReducer(storedMediaFileNames)
  const mediaToDownload = playlists.reduce(mediaToDownloadReducer, [])

  let uploadResult
  try {
    const uploadResult = await pMap(mediaToDownload, fetchAndUploadFile, {
      concurrency: 10,
      stopOnError: false,
    })
    logger.info('Spotify playlists image sync finished successfully.', {
      destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
      totalUploadedCount: uploadResult.length,
      uploadedFiles: uploadResult.map(({ fileName }) => fileName),
    })
  } catch (error) {
    logger.error('Something went wrong downloading Spotify playlist media files.', error)
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
      totalUploadedMediaCount: uploadResult?.length ?? 0,
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

  // Generate AI summary using Gemini
  let aiSummary = null
  try {
    aiSummary = await generateSpotifySummary(widgetContent)
    widgetContent.aiSummary = aiSummary
  } catch (error) {
    logger.error('Failed to generate AI summary:', error)
    // Continue with sync even if AI summary fails
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

  const saveAISummary = async () => {
    if (aiSummary) {
      await db
        .collection(DATABASE_COLLECTION_SPOTIFY)
        .doc('last-response_ai-summary')
        .set({
          summary: aiSummary,
          generatedAt: Timestamp.now(),
        })
    }
  }

  try {
    await Promise.all(
      [savePlaylists()],
      [saveTopTracksResponse()],
      [saveUserProfileResponse()],
      // [saveWidgetContent()],
      [saveAISummary()]
    )

    logger.info('Spotify sync finished successfully.', {
      tracksSyncedCount: topTracks.length,
      totalUploadedMediaCount: uploadResult?.length ?? 0,
    })

    return {
      result: 'SUCCESS',
      tracksSyncedCount: topTracks.length,
      totalUploadedMediaCount: uploadResult?.length ?? 0,
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

export default syncSpotifyTopTracks
