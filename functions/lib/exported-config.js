/**
 * Maps firebase functions:config:export JSON paths to process.env names.
 * Used when loading the FUNCTIONS_CONFIG_EXPORT secret (params migration).
 */
export const CONFIG_PATH_TO_ENV = {
  'auth.client_api_key': 'CLIENT_API_KEY',
  'auth.client_auth_domain': 'CLIENT_AUTH_DOMAIN',
  'auth.client_project_id': 'CLIENT_PROJECT_ID',
  'gemini.api_key': 'GEMINI_API_KEY',
  'storage.firestore_database_url': 'STORAGE_FIRESTORE_DATABASE_URL',
  'storage.cloud_storage_images_bucket': 'CLOUD_STORAGE_IMAGES_BUCKET',
  'storage.image_cdn_base_url': 'IMAGE_CDN_BASE_URL',
  'discogs.api_key': 'DISCOGS_API_KEY',
  'discogs.username': 'DISCOGS_USERNAME',
  'flickr.api_key': 'FLICKR_API_KEY',
  'flickr.user_id': 'FLICKR_USER_ID',
  'steam.api_key': 'STEAM_API_KEY',
  'steam.user_id': 'STEAM_USER_ID',
  'github.access_token': 'GITHUB_ACCESS_TOKEN',
  'github.username': 'GITHUB_USERNAME',
  'spotify.client_id': 'SPOTIFY_CLIENT_ID',
  'spotify.client_secret': 'SPOTIFY_CLIENT_SECRET',
  'spotify.redirect_uri': 'SPOTIFY_REDIRECT_URI',
  'spotify.refresh_token': 'SPOTIFY_REFRESH_TOKEN',
  'goodreads.key': 'GOODREADS_API_KEY',
  'goodreads.user_id': 'GOODREADS_USER_ID',
  'instagram.access_token': 'INSTAGRAM_ACCESS_TOKEN',
  'google.books_api_key': 'GOOGLE_BOOKS_API_KEY',
}

/**
 * Apply exported config (from FUNCTIONS_CONFIG_EXPORT secret) to process.env
 * so existing code that reads process.env.* keeps working.
 * @param {Record<string, unknown>} data - Parsed JSON from the secret (nested object)
 */
export function applyExportedConfigToEnv(data) {
  if (!data || typeof data !== 'object') return
  for (const [configPath, envVar] of Object.entries(CONFIG_PATH_TO_ENV)) {
    const value = configPath.split('.').reduce((obj, key) => obj?.[key], data)
    if (value != null && typeof value === 'string') {
      process.env[envVar] = value
    }
  }
}
