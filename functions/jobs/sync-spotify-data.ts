import pMap from 'p-map'
import type { DocumentStore } from '../ports/document-store.js'
import {
  describeMediaStore,
  listStoredMedia,
  storeRemoteMedia,
  toPublicMediaUrl,
} from '../services/media/media-service.js'

import getSpotifyAccessToken from '../api/spotify/get-access-token.js'
import getSpotifyPlaylists from '../api/spotify/get-playlists.js'
import getSpotifyTopTracks from '../api/spotify/get-top-tracks.js'
import getSpotifyUserProfile from '../api/spotify/get-user-profile.js'
import {
  getDefaultWidgetUserId,
  toProviderCollectionPath,
  toProviderMediaPrefix,
} from '../config/backend-paths.js'
import { getSpotifyConfig } from '../config/backend-config.js'
import { getLogger } from '../services/logger.js'
import transformTrackToCollectionItem from '../transformers/track-to-collection-item.js'
import { toStoredDateTime } from '../utils/time.js'
import type { SyncJobExecutionOptions } from '../types/sync-pipeline.js'

const SPOTIFY_MOSAIC_BASE_URL = 'https://mosaic.scdn.co/300/'

// Spotify playlists return 3 image sizes: 640x640, 300x300, and 60x60. I'm only interested in the 300x300 size.
const getMediaURLFromPlaylist = playlist => playlist.images?.find(playlist => playlist.height === 300 || playlist.width === 300)?.url

// Reducer to handle media filtering and transformation
const getMediaToDownloadReducer = (
  storedMediaFileNames = [],
  { source = 'live', userId = getDefaultWidgetUserId() }: SyncJobExecutionOptions = {}
) => (acc, playlist) => {
  const mediaURL = getMediaURLFromPlaylist(playlist)
  if (!mediaURL) {
    return acc
  }

  // I'm using the media filename — a hash — to identify the media file in GCP Storage because I assume the
  // images on mosaic.scdn.co rotate and change over time based on the playlist.
  const id = mediaURL.replace(SPOTIFY_MOSAIC_BASE_URL, '')
  const destinationPath = `${toProviderMediaPrefix('spotify', userId, 'playlists/', source)}${id}.jpg`
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

const transformPlaylists = (
  playlists,
  { source = 'live', userId = getDefaultWidgetUserId() }: SyncJobExecutionOptions = {}
) => playlists.map(playlist => {
  const id = getMediaURLFromPlaylist(playlist)?.replace(SPOTIFY_MOSAIC_BASE_URL, '')
  const cdnImageURL = toPublicMediaUrl(
    `${toProviderMediaPrefix('spotify', userId, 'playlists/', source)}${id}.jpg`
  )
  return {
    ...playlist,
    cdnImageURL
  }
})

const syncSpotifyTopTracks = async (
  documentStore: DocumentStore,
  options: SyncJobExecutionOptions = {}
) => {
  const logger = getLogger()
  const { source = 'live', userId = getDefaultWidgetUserId() } = options
  const spotifyCollectionPath = toProviderCollectionPath('spotify', userId, source)
  const { clientId, clientSecret, redirectUri: redirectURI, refreshToken } = getSpotifyConfig()

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
    playlists = transformPlaylists(playlistsResponse.items, options)
    playlistsCount = playlistsResponse.total
  } catch (error) {
    logger.error('Failed to fetch Spotify playlists.', error)
    return {
      result: 'FAILURE',
      error,
    }
  }

  const storedMediaFileNames = await listStoredMedia()

  const mediaToDownloadReducer = getMediaToDownloadReducer(storedMediaFileNames, options)
  const mediaToDownload = playlists.reduce(mediaToDownloadReducer, [])

  let uploadResult
  try {
    uploadResult = await pMap(mediaToDownload, storeRemoteMedia, {
      concurrency: 10,
      stopOnError: false,
    })
    logger.info('Spotify playlists image sync finished successfully.', {
      mediaStore: describeMediaStore(),
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
      synced: toStoredDateTime(),
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

  const savePlaylists = async () => await documentStore.setDocument(
    `${spotifyCollectionPath}/last-response_playlists`,
    {
      response: playlistsResponse,
      fetchedAt: toStoredDateTime(),
    }
  )

  const saveTopTracksResponse = async () => await documentStore.setDocument(
    `${spotifyCollectionPath}/last-response_top-tracks`,
    {
      response: topTracks,
      fetchedAt: toStoredDateTime(),
    }
  )

  const saveUserProfileResponse = async () => await documentStore.setDocument(
    `${spotifyCollectionPath}/last-response_user-profile`,
    {
      response: userProfile,
      fetchedAt: toStoredDateTime(),
    }
  )

  const saveWidgetContent = async () =>
    await documentStore.setDocument(`${spotifyCollectionPath}/widget-content`, widgetContent)

  try {
    await Promise.all([
      savePlaylists(),
      saveTopTracksResponse(),
      saveUserProfileResponse(),
      saveWidgetContent(),
    ])

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
