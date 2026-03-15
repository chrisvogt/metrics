import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import { toDateOrDefault, toUserWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()

const getDiscogsWidgetContent = async (
  userId: string = getDefaultWidgetUserId(),
  documentStore: DocumentStore = defaultDocumentStore
) => {
  const discogsWidgetContentPath = toUserWidgetContentPath(userId, 'discogs')
  const data = await documentStore.getDocument<{
    meta?: { synced?: unknown }
  } & Record<string, unknown>>(discogsWidgetContentPath)

  if (!data) {
    return {
      meta: {},
    }
  }

  const { meta = {}, ...responseData } = data

  const transformedMeta = {
    ...meta,
    ...(meta.synced ? { synced: toDateOrDefault(meta.synced) } : {}),
  }

  return {
    ...responseData,
    meta: transformedMeta,
  }
}

export default getDiscogsWidgetContent
