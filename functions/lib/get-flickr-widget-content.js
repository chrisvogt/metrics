const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const DATABASE_COLLECTION_FLICKR = 'flickr'

const getFlickrWidgetContent = async () => {
  try {
    const db = admin.firestore()
    const doc = await db
      .collection(DATABASE_COLLECTION_FLICKR)
      .doc('last-response')
      .get()

    if (!doc.exists) {
      throw new Error('No Flickr data found in Firestore')
    }

    const { response } = doc.data()
    return response
  } catch (error) {
    logger.error('Error getting Flickr widget content:', error)
    throw error
  }
}

module.exports = getFlickrWidgetContent 