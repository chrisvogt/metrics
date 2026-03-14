import { Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'

import type { DocumentStore } from '../../ports/document-store.js'
import { DATABASE_COLLECTION_FLICKR } from '../../config/constants.js'
import fetchPhotos from '../../api/flickr/fetch-photos.js'

export const FLICKR_LAST_RESPONSE_PATH = `${DATABASE_COLLECTION_FLICKR}/last-response`
export const FLICKR_WIDGET_CONTENT_PATH = `${DATABASE_COLLECTION_FLICKR}/widget-content`

const syncFlickrData = async (documentStore: DocumentStore) => {
  const flickrUsername = process.env.FLICKR_USER_ID

  try {
    const photosResponse = await fetchPhotos()

    await documentStore.setDocument(FLICKR_LAST_RESPONSE_PATH, {
      response: photosResponse,
      fetchedAt: Timestamp.now(),
    })

    const photos = Array.isArray(photosResponse?.photos) ? photosResponse.photos : []
    const photoCount = typeof photosResponse?.total === 'number' ? photosResponse.total : 0

    const widgetContent = {
      collections: {
        photos,
      },
      meta: {
        synced: Timestamp.now(),
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

    await documentStore.setDocument(FLICKR_WIDGET_CONTENT_PATH, widgetContent)

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
