const CLOUD_STORAGE_IMAGES_BUCKET = process.env.CLOUD_STORAGE_IMAGES_BUCKET

// Current username - will be configurable later
const CURRENT_USERNAME = 'chrisvogt'

const CLOUD_STORAGE_INSTAGRAM_PATH = `${CURRENT_USERNAME}/instagram/`

const CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH = `${CURRENT_USERNAME}/spotify/playlists/`

// Database collections - now user-scoped
const DATABASE_COLLECTION_FLICKR = `users/${CURRENT_USERNAME}/flickr`

const DATABASE_COLLECTION_SPOTIFY = `users/${CURRENT_USERNAME}/spotify`

const DATABASE_COLLECTION_STEAM = `users/${CURRENT_USERNAME}/steam`

const DATABASE_COLLECTION_INSTAGRAM = `users/${CURRENT_USERNAME}/instagram`

const DATABASE_COLLECTION_GOODREADS = `users/${CURRENT_USERNAME}/goodreads`

const DATABASE_COLLECTION_GITHUB = `users/${CURRENT_USERNAME}/github`

const IMAGE_CDN_BASE_URL = process.env.IMAGE_CDN_BASE_URL

export {
  CLOUD_STORAGE_IMAGES_BUCKET,
  CLOUD_STORAGE_INSTAGRAM_PATH,
  CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
  CURRENT_USERNAME,
  DATABASE_COLLECTION_FLICKR,
  DATABASE_COLLECTION_INSTAGRAM,
  DATABASE_COLLECTION_SPOTIFY,
  DATABASE_COLLECTION_STEAM,
  DATABASE_COLLECTION_GOODREADS,
  DATABASE_COLLECTION_GITHUB,
  IMAGE_CDN_BASE_URL
}
