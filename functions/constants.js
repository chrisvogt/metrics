const functions = require('firebase-functions/v1')
const config = functions.config()

const CLOUD_STORAGE_IMAGES_BUCKET = config.storage.cloud_storage_images_bucket

const CLOUD_STORAGE_INSTAGRAM_PATH = 'ig/'

const CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH = 'spotify/playlists/'

const DATABASE_COLLECTION_FLICKR = 'flickr'

const DATABASE_COLLECTION_SPOTIFY = 'spotify'

const DATABASE_COLLECTION_STEAM = 'steam'

const DATABASE_COLLECTION_INSTAGRAM = 'instagram'

const IMAGE_CDN_BASE_URL = config.storage.image_cdn_base_url

module.exports = {
  CLOUD_STORAGE_IMAGES_BUCKET,
  CLOUD_STORAGE_INSTAGRAM_PATH,
  CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
  DATABASE_COLLECTION_FLICKR,
  DATABASE_COLLECTION_INSTAGRAM,
  DATABASE_COLLECTION_SPOTIFY,
  DATABASE_COLLECTION_STEAM,
  IMAGE_CDN_BASE_URL
}
