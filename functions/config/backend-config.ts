import * as dotenv from 'dotenv'
import path from 'path'

const FUNCTIONS_CONFIG_APPLIED_ENV = '__FUNCTIONS_CONFIG_APPLIED__'
const DEFAULT_WIDGET_USER_ID = 'chrisvogt'
const DEFAULT_WIDGET_HOSTNAME_USER_MAP = {
  'api.chronogrove.com': 'chronogrove',
} as const

export const isProductionEnvironment = () => process.env.NODE_ENV === 'production'

export const loadLocalDevelopmentEnv = (envPath: string): void => {
  if (isProductionEnvironment()) {
    return
  }

  dotenv.config({ path: envPath })
}

export const hasAppliedRuntimeConfig = (): boolean =>
  Boolean(process.env[FUNCTIONS_CONFIG_APPLIED_ENV])

export const markRuntimeConfigApplied = (): void => {
  process.env[FUNCTIONS_CONFIG_APPLIED_ENV] = '1'
}

/** Firebase web client config only (apiKey, authDomain, projectId). Never add secrets here. */
export const getClientAuthConfig = () => ({
  apiKey: process.env.CLIENT_API_KEY,
  authDomain: process.env.CLIENT_AUTH_DOMAIN,
  projectId: process.env.CLIENT_PROJECT_ID,
})

export const getStorageConfig = () => {
  const mediaStoreBackend =
    process.env.MEDIA_STORE_BACKEND ?? (isProductionEnvironment() ? 'gcs' : 'disk')
  const mediaPublicBaseUrl =
    process.env.MEDIA_PUBLIC_BASE_URL ?? process.env.IMAGE_CDN_BASE_URL

  return {
    cloudStorageImagesBucket: process.env.CLOUD_STORAGE_IMAGES_BUCKET,
    imageCdnBaseUrl: mediaPublicBaseUrl,
    localMediaRoot: process.env.LOCAL_MEDIA_ROOT ?? path.resolve(process.cwd(), 'tmp/media'),
    mediaPublicBaseUrl,
    mediaStoreBackend,
  }
}

export const getDiscogsConfig = () => ({
  apiKey: process.env.DISCOGS_API_KEY,
  username: process.env.DISCOGS_USERNAME,
})

export const getFlickrConfig = () => ({
  apiKey: process.env.FLICKR_API_KEY,
  userId: process.env.FLICKR_USER_ID,
})

/** Flickr “API Key” is the OAuth 1.0a consumer key; “Secret” is the consumer secret. */
export const getFlickrOAuthConfig = () => ({
  consumerKey: process.env.FLICKR_API_KEY,
  consumerSecret: process.env.FLICKR_API_SECRET ?? process.env.FLICKR_CONSUMER_SECRET,
  callbackUrl:
    process.env.FLICKR_OAUTH_CALLBACK_URL ??
    process.env.FLICKR_OAUTH_REDIRECT_URI ??
    '',
  /** Browser redirect after successful token exchange (path or absolute URL). */
  appSuccessRedirect:
    process.env.FLICKR_OAUTH_SUCCESS_REDIRECT?.trim() || '/onboarding?oauth=flickr&status=success',
})

/**
 * 32+ byte secret (base64). Used with HKDF to derive per-user AES-256 keys for integration tokens.
 *
 * **Deployed:** bound from Secret Manager via `defineSecret('INTEGRATION_TOKEN_MASTER_KEY')` in
 * `runtime/firebase-runtime-config.ts` (injected as `process.env.INTEGRATION_TOKEN_MASTER_KEY`).
 * **Local:** `functions/.env.local` via `loadLocalDevelopmentEnv` when `NODE_ENV !== 'production'`.
 */
export const getIntegrationTokenMasterKeyBytes = (): Buffer => {
  const b64 = process.env.INTEGRATION_TOKEN_MASTER_KEY
  if (!b64) {
    throw new Error('INTEGRATION_TOKEN_MASTER_KEY is not configured')
  }
  const buf = Buffer.from(b64.trim(), 'base64')
  if (buf.length < 32) {
    throw new Error('INTEGRATION_TOKEN_MASTER_KEY must decode to at least 32 bytes')
  }
  return buf
}


export const getGitHubConfig = () => ({
  accessToken: process.env.GITHUB_ACCESS_TOKEN,
  username: process.env.GITHUB_USERNAME,
})

export const getGoodreadsConfig = () => ({
  apiKey: process.env.GOODREADS_API_KEY,
  userId: process.env.GOODREADS_USER_ID,
})

export const getGoogleBooksApiKey = (): string | undefined => process.env.GOOGLE_BOOKS_API_KEY

export const getGeminiApiKey = (): string | undefined => process.env.GEMINI_API_KEY

export const getInstagramAccessToken = (): string | undefined =>
  process.env.INSTAGRAM_ACCESS_TOKEN

export const getInstagramUserId = (): string | undefined =>
  process.env.INSTAGRAM_USER_ID

export const getSpotifyConfig = () => ({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
})

export const getSteamConfig = () => ({
  apiKey: process.env.STEAM_API_KEY,
  userId: process.env.STEAM_USER_ID,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

const parseStringMap = (
  rawValue: string | undefined,
  defaults: Record<string, string> = {}
): Record<string, string> => {
  if (!rawValue) {
    return { ...defaults }
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    const stringMap = isRecord(parsed) ? parsed : {}

    return Object.entries(stringMap).reduce<Record<string, string>>((acc, [key, value]) => {
      if (key.length > 0 && typeof value === 'string' && value.length > 0) {
        acc[key] = value
      }
      return acc
    }, {})
  } catch {
    return rawValue
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, entry) => {
        const [key, value] = entry.split('=').map((part) => part?.trim())
        if (key && value) {
          acc[key] = value
        }
        return acc
      }, {})
  }
}

const parseWidgetUserMap = (
  rawValue: string | undefined
): Record<string, string> => {
  return parseStringMap(rawValue, DEFAULT_WIDGET_HOSTNAME_USER_MAP)
}

export const getBackendPathConfig = () => ({
  defaultWidgetUserId: process.env.DEFAULT_WIDGET_USER_ID ?? DEFAULT_WIDGET_USER_ID,
  widgetUserIdByHostname: parseWidgetUserMap(process.env.WIDGET_USER_ID_BY_HOSTNAME),
  /**
   * When true: future resolver may consult Firestore (`tenant_hosts`) after the env map.
   * Default false so production behavior stays env-only until explicitly enabled.
   */
  firestoreTenantRoutingEnabled: process.env.ENABLE_FIRESTORE_TENANT_ROUTING === 'true',
})
