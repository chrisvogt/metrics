import { logger } from 'firebase-functions'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import { DATABASE_COLLECTION_FLICKR } from '../config/constants.js'
import type { DocumentStore } from '../ports/document-store.js'
import { toWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()
const flickrWidgetContentPath = toWidgetContentPath(DATABASE_COLLECTION_FLICKR)

const getFlickrWidgetContent = async (
  _userId?: string,
  documentStore: DocumentStore = defaultDocumentStore
) => {
  try {
    const widgetContent = await documentStore.getDocument(flickrWidgetContentPath)

    if (!widgetContent) {
      throw new Error('No Flickr data found in DocumentStore')
    }

    return widgetContent
  } catch (error) {
    logger.error('Error getting Flickr widget content:', error)
    throw error
  }
}

export default getFlickrWidgetContent
