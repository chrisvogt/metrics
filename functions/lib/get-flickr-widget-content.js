const admin = require('firebase-admin')
const { logger } = require('firebase-functions')
const { DATABASE_COLLECTION_FLICKR } = require('../constants')

const getFlickrWidgetContent = async () => {
  try {
    const db = admin.firestore()
    const doc = await db
      .collection(DATABASE_COLLECTION_FLICKR)
      .doc('widget-content')
      .get()

    if (!doc.exists) {
      throw new Error('No Flickr data found in Firestore')
    }

    const widgetContent = doc.data()
    return widgetContent
  } catch (error) {
    logger.error('Error getting Flickr widget content:', error)
    throw error
  }
}

module.exports = getFlickrWidgetContent 
