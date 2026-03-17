import type { DocumentStore } from '../ports/document-store.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import { getLogger } from '../services/logger.js'
import { toUserWidgetContentPath } from './widget-document-store.js'

const getFlickrWidgetContent = async (
  userId: string = getDefaultWidgetUserId(),
  documentStore: DocumentStore
) => {
  const logger = getLogger()
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
