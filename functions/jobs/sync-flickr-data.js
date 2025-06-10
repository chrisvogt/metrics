const admin = require('firebase-admin')
const { Timestamp } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')

const fetchPhotos = require('../api/flickr/fetch-photos')

const DATABASE_COLLECTION_FLICKR = 'flickr'

/**
 * Sync Flickr Data
 * 
 * Fetches recent photos from Flickr and stores them in Firestore.
 * Photos are stored with their metadata and URLs to different sizes.
 */
const syncFlickrData = async () => {
  try {
    const photosResponse = await fetchPhotos()
    // const db = admin.firestore()

    // await db
    //   .collection(DATABASE_COLLECTION_FLICKR)
    //   .doc('last-response')
    //   .set({
    //     response: photos,
    //     fetchedAt: Timestamp.now()
    //   })

    // const photoCount = photosResponse.total

    // const widgetContent = {
    //   collections: {
    //     photos: photosResponse.photos
    //   },
    //   meta: {
    //     synced: Timestamp.now(),
    //   },
    //   metrics: [
    //     ...(photoCount
    //       ? [
    //         {
    //           displayName: 'Photos',
    //           id: 'photos-count',
    //           value: photoCount,
    //         },
    //       ] : []
    //     ),
    //   ],
    //   profile: {
    //     // avatarURL,
    //     // displayName,
    //     // profileURL,
    //   }
    // }

    // await db.collection('goodreads').doc('widget-content').set(widgetContent),

    // logger.info('Flickr data sync completed successfully', {
    //   totalPhotos: photos.total,
    //   photosFetched: photos.photos.length
    // })

    return {
      result: 'SUCCESS',
      response: photosResponse,
      totalPhotos: photosResponse.total,
      photosFetched: photosResponse.photos.length
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
