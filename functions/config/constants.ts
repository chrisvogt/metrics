import { getDiscogsConfig, getStorageConfig } from './backend-config.js'
import { getUsersCollectionPath } from './backend-paths.js'

const {
  cloudStorageImagesBucket: CLOUD_STORAGE_IMAGES_BUCKET,
  imageCdnBaseUrl: IMAGE_CDN_BASE_URL,
  localMediaRoot: LOCAL_MEDIA_ROOT,
  mediaStoreBackend: MEDIA_STORE_BACKEND,
} = getStorageConfig()

const DATABASE_COLLECTION_USERS = getUsersCollectionPath()

const { username: DISCOGS_USERNAME } = getDiscogsConfig()

export {
  CLOUD_STORAGE_IMAGES_BUCKET,
  LOCAL_MEDIA_ROOT,
  MEDIA_STORE_BACKEND,
  DATABASE_COLLECTION_USERS,
  DISCOGS_USERNAME,
  IMAGE_CDN_BASE_URL,
}
