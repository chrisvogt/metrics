import { logger } from 'firebase-functions'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import { toUserWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()

const getFlickrWidgetContent = async (
  userId: string = getDefaultWidgetUserId(),
  documentStore: DocumentStore = defaultDocumentStore
) => {
  try {
    const flickrWidgetContentPath = toUserWidgetContentPath(userId, 'flickr')
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
