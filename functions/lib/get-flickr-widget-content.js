import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { DATABASE_COLLECTION_FLICKR } from '../constants.js'

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

export default getFlickrWidgetContent 
