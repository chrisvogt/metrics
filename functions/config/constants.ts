import { getDiscogsConfig, getStorageConfig } from './backend-config.js'
import {
  getDefaultWidgetUserId,
  getUsersCollectionPath,
  toMediaPrefix,
  toUserCollectionPath,
} from './backend-paths.js'

const {
  cloudStorageImagesBucket: CLOUD_STORAGE_IMAGES_BUCKET,
  imageCdnBaseUrl: IMAGE_CDN_BASE_URL,
  localMediaRoot: LOCAL_MEDIA_ROOT,
  mediaStoreBackend: MEDIA_STORE_BACKEND,
} = getStorageConfig()

const CURRENT_USERNAME = getDefaultWidgetUserId()

const CLOUD_STORAGE_DISCOGS_PATH = toMediaPrefix(CURRENT_USERNAME, 'discogs')

const CLOUD_STORAGE_INSTAGRAM_PATH = toMediaPrefix(CURRENT_USERNAME, 'instagram')

const CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH = toMediaPrefix(CURRENT_USERNAME, 'spotify', 'playlists/')

const DATABASE_COLLECTION_DISCOGS = toUserCollectionPath(CURRENT_USERNAME, 'discogs')

const DATABASE_COLLECTION_FLICKR = toUserCollectionPath(CURRENT_USERNAME, 'flickr')

const DATABASE_COLLECTION_SPOTIFY = toUserCollectionPath(CURRENT_USERNAME, 'spotify')

const DATABASE_COLLECTION_STEAM = toUserCollectionPath(CURRENT_USERNAME, 'steam')

const DATABASE_COLLECTION_INSTAGRAM = toUserCollectionPath(CURRENT_USERNAME, 'instagram')

const DATABASE_COLLECTION_GOODREADS = toUserCollectionPath(CURRENT_USERNAME, 'goodreads')

const DATABASE_COLLECTION_GITHUB = toUserCollectionPath(CURRENT_USERNAME, 'github')

const DATABASE_COLLECTION_USERS = getUsersCollectionPath()

const { username: DISCOGS_USERNAME } = getDiscogsConfig()

export {
  CLOUD_STORAGE_IMAGES_BUCKET,
  LOCAL_MEDIA_ROOT,
  MEDIA_STORE_BACKEND,
  CLOUD_STORAGE_DISCOGS_PATH,
  CLOUD_STORAGE_INSTAGRAM_PATH,
  CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
  CURRENT_USERNAME,
  DATABASE_COLLECTION_DISCOGS,
  DATABASE_COLLECTION_FLICKR,
  DATABASE_COLLECTION_INSTAGRAM,
  DATABASE_COLLECTION_SPOTIFY,
  DATABASE_COLLECTION_STEAM,
  DATABASE_COLLECTION_GOODREADS,
  DATABASE_COLLECTION_GITHUB,
  DATABASE_COLLECTION_USERS,
  DISCOGS_USERNAME,
  IMAGE_CDN_BASE_URL,
}
