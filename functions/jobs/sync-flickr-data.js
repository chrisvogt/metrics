const admin = require('firebase-admin')
const { Timestamp } = require('firebase-admin/firestore')
const { config, logger } = require('firebase-functions')

const { DATABASE_COLLECTION_FLICKR } = require('../constants')
const fetchPhotos = require('../api/flickr/fetch-photos')

/**
 * Sync Flickr Data
 * 
 * Fetches recent photos from Flickr and stores them in Firestore.
 * Photos are stored with their metadata and URLs to different sizes.
 */
const syncFlickrData = async () => {
  const { flickr: { user_id: flickrUsername } = {} } = config()

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

module.exports = syncFlickrData 
