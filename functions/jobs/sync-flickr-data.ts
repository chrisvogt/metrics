import type { DocumentStore } from '../ports/document-store.js'
import { getFlickrConfig } from '../config/backend-config.js'
import { getDefaultWidgetUserId, toProviderCollectionPath } from '../config/backend-paths.js'
import { getLogger } from '../services/logger.js'
import { toStoredDateTime } from '../utils/time.js'
import fetchPhotos from '../api/flickr/fetch-photos.js'
import type { FlickrWidgetDocument } from '../types/widget-content.js'
import type { SyncJobExecutionOptions } from '../types/sync-pipeline.js'

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
   
  const { userId: flickrUsername } = getFlickrConfig()

  try {
    onProgress?.({
      phase: 'flickr.photos',
      message: 'Fetching recent photos from Flickr.',
    })
    const photosResponse = await fetchPhotos()

    onProgress?.({
      phase: 'flickr.persist',
      message: 'Reticulating splines.',
    })
    await documentStore.setDocument(toFlickrLastResponsePath(options), {
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
        displayName: flickrUsername,
        profileURL: `https://www.flickr.com/photos/${flickrUsername}/`,
      },
    }

    await documentStore.setDocument(toFlickrWidgetContentPath(options), widgetContent)

    logger.info('Flickr data sync completed successfully', {
      totalPhotos: photoCount,
      photosFetched: photos.length,
    })

    return {
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
