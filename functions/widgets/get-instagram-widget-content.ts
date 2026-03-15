import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'
import { getDefaultWidgetUserId } from '../config/backend-paths.js'
import { toDateOrDefault, toUserWidgetContentPath } from './widget-document-store.js'

const defaultDocumentStore = new FirestoreDocumentStore()

const getInstagramWidgetContent = async (
  userId: string = getDefaultWidgetUserId(),
  documentStore: DocumentStore = defaultDocumentStore
) => {
  const instagramWidgetContentPath = toUserWidgetContentPath(userId, 'instagram')
  const data = await documentStore.getDocument<{
    media?: unknown[]
    meta?: { synced?: unknown }
    profile?: {
      biography?: string
      followersCount?: number
      mediaCount?: number
      username?: string
    }
  }>(instagramWidgetContentPath)

  if (!data) {
    throw new Error('Failed to get a response.')
  }

  const {
    meta = {},
    media,
    profile: {
      biography = '',
      followersCount = 0,
      mediaCount = 0,
      username = '',
    } = {},
  } = data

  return {
    collections: {
      media,
    },
    meta: {
      synced: toDateOrDefault(meta.synced),
    },
    metrics: [
      {
        displayName: 'Followers',
        id: 'followers-count',
        value: followersCount,
      },
      {
        displayName: 'Posts',
        id: 'media-count',
        value: mediaCount,
      },
    ],
    provider: {
      displayName: 'Instagram',
      id: 'instagram',
    },
    profile: {
      biography,
      displayName: username,
      profileURL: `https://www.instagram.com/${username}`,
    },
  }
}

export default getInstagramWidgetContent
