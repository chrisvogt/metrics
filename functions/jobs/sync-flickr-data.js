import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'

import { DATABASE_COLLECTION_FLICKR } from '../constants.js'
import fetchPhotos from '../api/flickr/fetch-photos.js'

/**
 * Sync Flickr Data
 * 
 * Fetches recent photos from Flickr and stores them in Firestore.
 * Photos are stored with their metadata and URLs to different sizes.
 */
const syncFlickrData = async () => {
  const flickrUsername = process.env.FLICKR_USER_ID

  try {
    const photosResponse = await fetchPhotos()
    const db = admin.firestore()

    await db
      .collection(DATABASE_COLLECTION_FLICKR)
      .doc('last-response')
      .set({
        response: photosResponse,
        fetchedAt: Timestamp.now()
      })

    const photoCount = photosResponse.total

    const widgetContent = {
      collections: {
        photos: photosResponse.photos
      },
      meta: {
        synced: Timestamp.now(),
      },
      metrics: [
        ...(photoCount
          ? [
            {
              displayName: 'Photos',
              id: 'photos-count',
              value: photoCount,
            },
          ] : []
        ),
      ],
      profile: {
        displayName: flickrUsername,
        profileURL: `https://www.flickr.com/photos/${flickrUsername}/`,
      }
    }

    await db.collection(DATABASE_COLLECTION_FLICKR)
      .doc('widget-content')
      .set(widgetContent),

    logger.info('Flickr data sync completed successfully', {
      totalPhotos: photosResponse.total,
      photosFetched: photosResponse.photos.length
    })

    return {
      result: 'SUCCESS',
      widgetContent: widgetContent,
    }
  } catch (error) {
    logger.error('Flickr data sync failed:', error)
    return {
      result: 'FAILURE',
      error: error.message
    }
  }
}

export default syncFlickrData 
