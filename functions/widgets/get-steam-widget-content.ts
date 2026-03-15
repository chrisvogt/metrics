import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import { toDateOrDefault, toUserWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()

const getSteamWidgetContent = async (
  userId: string = getDefaultWidgetUserId(),
  documentStore: DocumentStore = defaultDocumentStore
) => {
  const steamWidgetContentPath = toUserWidgetContentPath(userId, 'steam')
  const data = await documentStore.getDocument<{
    meta?: { synced?: unknown }
  } & Record<string, unknown>>(steamWidgetContentPath)

  if (!data) {
    return { meta: { synced: new Date(0) } }
  }

  const { meta = {}, ...responseData } = data

  return {
    ...responseData,
    meta: {
      ...meta,
      synced: toDateOrDefault(meta.synced),
    },
  }
}

export default getSteamWidgetContent
