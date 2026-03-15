import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import { DATABASE_COLLECTION_GOODREADS } from '../config/constants.js'
import type { DocumentStore } from '../ports/document-store.js'
import { toDateOrDefault, toWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()
const goodreadsWidgetContentPath = toWidgetContentPath(DATABASE_COLLECTION_GOODREADS)

const getGoodreadsWidgetContent = async (
  _userId?: string,
  documentStore: DocumentStore = defaultDocumentStore
) => {
  const data = await documentStore.getDocument<{
    meta?: { synced?: unknown }
  } & Record<string, unknown>>(goodreadsWidgetContentPath)

  if (!data) {
    return {
      meta: { synced: new Date(0) },
      recentBooks: [],
      summary: null,
    }
  }

  const { meta = {}, ...responseData } = data

  const transformedMeta = {
    ...meta,
    synced: toDateOrDefault(meta.synced),
  }

  return {
    ...responseData,
    meta: transformedMeta,
  }
}

export default getGoodreadsWidgetContent
