/**
 * Google Cloud Storage Image Bucket Key
 *
 * Identifier for the Cloud Storage bucket where my images are stored.
 *
 * @var {String} CLOUD_STORAGE_IMAGES_BUCKET Google Cloud Storage bucket identifier.
 */
const CLOUD_STORAGE_IMAGES_BUCKET = 'img.chrisvogt.me'

/**
 * Google Cloud Storage Images Path
 *
 * The path where I store Instagram images in my Google Cloud Storage bucket.
 *
 * @var {String} CLOUD_STORAGE_INSTAGRAM_PATH Google Cloud Storage image path.
 */
const CLOUD_STORAGE_INSTAGRAM_PATH = 'ig/'

/**
 * Personal Image CDN Base URL
 *
 * Used to construct URLs for my personal image CDN.
 *
 * @var {String} IMAGE_CDN_BASE_URL Base URL prepended to images in my CDN.
 */
const IMAGE_CDN_BASE_URL = 'https://img.chrisvogt.me/'

/**
 * Providers
 *
 * Keys representing providers that integrations exist for. Also used as table
 * keys for assoicated data in the database.
 *
 * @var {Object} providers Dictionary of provider keys.
 */
const providers = {
  INSTAGRAM: 'instagram',
  GITHUB: 'github',
  GOODREADS: 'goodreads',
  SPOTIFY: 'spotify',
  STEAM: 'steam',
}

/**
 * Request response result values
 *
 * @var {Object} responses Dictionary of API request result strings.
 */
const responses = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
}

module.exports = {
  CLOUD_STORAGE_IMAGES_BUCKET,
  CLOUD_STORAGE_INSTAGRAM_PATH,
  IMAGE_CDN_BASE_URL,
  providers,
  responses,
}
