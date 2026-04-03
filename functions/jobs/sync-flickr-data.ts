import type { DocumentStore } from '../ports/document-store.js'
import { getFlickrConfig } from '../config/backend-config.js'
import { getDefaultWidgetUserId, toProviderCollectionPath } from '../config/backend-paths.js'
import { getLogger } from '../services/logger.js'
import { toStoredDateTime } from '../utils/time.js'
import fetchPhotos from '../api/flickr/fetch-photos.js'
import type { FlickrWidgetDocument } from '../types/widget-content.js'
import type { SyncJobExecutionOptions } from '../types/sync-pipeline.js'
import { loadFlickrAuthForUser } from '../services/flickr-integration-credentials.js'

export const toFlickrLastResponsePath = ({
  userId = getDefaultWidgetUserId(),
}: SyncJobExecutionOptions = {}) => `${toProviderCollectionPath('flickr', userId)}/last-response`
export const toFlickrWidgetContentPath = ({
  userId = getDefaultWidgetUserId(),
}: SyncJobExecutionOptions = {}) => `${toProviderCollectionPath('flickr', userId)}/widget-content`

const syncFlickrData = async (
  documentStore: DocumentStore,
  options: SyncJobExecutionOptions = {}
) => {
  const logger = getLogger()
  const { onProgress } = options
  const storageUserId = options.userId ?? getDefaultWidgetUserId()
  const integrationLookupUserId = options.integrationLookupUserId ?? storageUserId

  const envConfig = getFlickrConfig()
  let displayName: string | undefined = envConfig.userId ?? undefined
  let profilePathSegment = envConfig.userId ?? ''

  try {
    const oauth = await loadFlickrAuthForUser(documentStore, integrationLookupUserId)
    const flickrAuthMode = oauth ? 'oauth' : 'env'

    onProgress?.({
      phase: 'flickr.auth',
      message:
        flickrAuthMode === 'oauth'
          ? 'Using your connected Flickr account (OAuth).'
          : 'Using server Flickr API credentials (legacy).',
    })

    if (oauth) {
      displayName = oauth.flickrUsername || oauth.userNsid
      profilePathSegment = oauth.flickrUsername || oauth.userNsid
    }

    onProgress?.({
      phase: 'flickr.photos',
      message: 'Fetching recent photos from Flickr.',
    })
    const photosResponse = oauth
      ? await fetchPhotos({ oauth })
      : await fetchPhotos()

    onProgress?.({
      phase: 'flickr.persist',
      message: 'Reticulating splines.',
    })
    await documentStore.setDocument(toFlickrLastResponsePath({ ...options, userId: storageUserId }), {
      response: photosResponse,
      fetchedAt: toStoredDateTime(),
    })

    const photos = Array.isArray(photosResponse?.photos) ? photosResponse.photos : []
    const photoCount = typeof photosResponse?.total === 'number' ? photosResponse.total : 0

    const widgetContent: FlickrWidgetDocument = {
      collections: {
        photos,
      },
      meta: {
        synced: toStoredDateTime(),
      },
      metrics: [
        ...(photoCount > 0
          ? [
            {
              displayName: 'Photos',
              id: 'photos-count',
              value: photoCount,
            },
          ]
          : []),
      ],
      profile: {
        displayName,
        profileURL: `https://www.flickr.com/photos/${profilePathSegment}/`,
      },
    }

    await documentStore.setDocument(toFlickrWidgetContentPath({ ...options, userId: storageUserId }), widgetContent)

    logger.info('Flickr data sync completed successfully', {
      totalPhotos: photoCount,
      photosFetched: photos.length,
      userId: storageUserId,
      integrationLookupUserId,
      authMode: flickrAuthMode,
    })

    return {
      flickrAuthMode,
      result: 'SUCCESS',
      widgetContent,
    }
  } catch (error) {
    logger.error('Flickr data sync failed:', error)
    return {
      result: 'FAILURE',
      error: (error as Error).message,
    }
  }
}

export default syncFlickrData
