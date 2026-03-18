import { createExpressApp, getSessionAuthError } from './app/create-express-app.js'
import { createBackendBootstrap } from './bootstrap/create-backend-bootstrap.js'
import createUserJob from './jobs/create-user.js'
import type { RuntimeUserCreationData } from './ports/runtime-platform.js'
import syncGoodreadsDataJob from './jobs/sync-goodreads-data.js'
import syncInstagramDataJob from './jobs/sync-instagram-data.js'
import syncSpotifyDataJob from './jobs/sync-spotify-data.js'
import syncSteamDataJob from './jobs/sync-steam-data.js'
import syncFlickrDataJob from './jobs/sync-flickr-data.js'

const {
  authService,
  documentStore,
  ensureRuntimeConfigApplied,
  getClientAuthConfig,
  logger,
  resolveMediaStore,
  runtimePlatform,
  runtimeSecrets,
} = createBackendBootstrap()

export const expressApp = createExpressApp({
  authService,
  documentStore,
  ensureRuntimeConfigApplied,
  getClientAuthConfig,
  logger,
  resolveMediaStore,
})

export { getSessionAuthError }

export const syncGoodreadsData = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await syncGoodreadsDataJob(documentStore)
}, runtimeSecrets)

export const syncSpotifyData = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await syncSpotifyDataJob(documentStore)
}, runtimeSecrets)

export const syncSteamData = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await syncSteamDataJob(documentStore)
}, runtimeSecrets)

export const syncInstagramData = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await syncInstagramDataJob(documentStore)
}, runtimeSecrets)

export const syncFlickrData = runtimePlatform.registerScheduledFunction(async () => {
  await ensureRuntimeConfigApplied()
  await syncFlickrDataJob(documentStore)
}, runtimeSecrets)

export const handleUserCreation = runtimePlatform.registerUserCreationTrigger(async (event) => {
  await ensureRuntimeConfigApplied()
  const rawUser: RuntimeUserCreationData | undefined = event.data
  const user = rawUser
    ? {
        ...rawUser,
        displayName: rawUser.displayName ?? undefined,
      }
    : undefined
  if (!user) {
    logger.error('handleUserCreation: event.data missing')
    return
  }
  const result = await createUserJob(user, documentStore)
  if (result.result !== 'SUCCESS') {
    logger.error('User creation trigger failed', { uid: user.uid, error: result.error })
  } else {
    logger.info('User creation trigger completed successfully', { uid: user.uid })
  }
}, runtimeSecrets)

export const app = runtimePlatform.registerHttpFunction(async (req, res) => {
  await ensureRuntimeConfigApplied()
  expressApp(req as Parameters<typeof expressApp>[0], res as Parameters<typeof expressApp>[1])
}, runtimeSecrets)
