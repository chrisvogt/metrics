import { logger } from 'firebase-functions'

import admin from 'firebase-admin'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  getFirebaseClientConfig,
  isProductionEnvironment,
} from './config/backend-config.js'
import {
  bootstrapLocalRuntimeEnv,
  ensureRuntimeConfigApplied,
} from './config/runtime-config.js'
import { FirestoreDocumentStore } from './adapters/storage/firestore-document-store.js'
import {
  firebaseRuntimeConfigSource,
  getFirebaseFirestoreDatabaseUrl,
  getFirebaseRuntimeSecrets,
} from './runtime/firebase-runtime-config.js'
import { initializeFirebaseAdminRuntime } from './runtime/firebase-admin-runtime.js'
import {
  registerFirebaseHttpFunction,
  registerFirebaseScheduledFunction,
  registerFirebaseUserCreationTrigger,
} from './runtime/firebase-functions-runtime.js'
import { createExpressApp, getSessionAuthError } from './app/create-express-app.js'
import createUserJob from './jobs/create-user.js'
import syncGoodreadsDataJob from './jobs/sync-goodreads-data.js'
import syncInstagramDataJob from './jobs/sync-instagram-data.js'
import syncSpotifyDataJob from './jobs/sync-spotify-data.js'
import syncSteamDataJob from './jobs/sync-steam-data.js'
import syncFlickrDataJob from './jobs/sync-flickr-data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from functions/.env synchronously in development.
bootstrapLocalRuntimeEnv(path.resolve(__dirname, '../.env'))

initializeFirebaseAdminRuntime({
  admin,
  databaseURL: getFirebaseFirestoreDatabaseUrl(),
  isProduction: isProductionEnvironment(),
  projectId: 'personal-stats-chrisvogt',
})

const documentStore = new FirestoreDocumentStore()
const applyFirebaseRuntimeConfig = () =>
  ensureRuntimeConfigApplied(firebaseRuntimeConfigSource, logger.warn)

export const expressApp = createExpressApp({
  admin,
  documentStore,
  ensureRuntimeConfigApplied: applyFirebaseRuntimeConfig,
  getFirebaseClientConfig,
  logger,
})

export { getSessionAuthError }

export const syncGoodreadsData = registerFirebaseScheduledFunction(async () => {
  await applyFirebaseRuntimeConfig()
  await syncGoodreadsDataJob()
}, getFirebaseRuntimeSecrets())

export const syncSpotifyData = registerFirebaseScheduledFunction(async () => {
  await applyFirebaseRuntimeConfig()
  await syncSpotifyDataJob()
}, getFirebaseRuntimeSecrets())

export const syncSteamData = registerFirebaseScheduledFunction(async () => {
  await applyFirebaseRuntimeConfig()
  await syncSteamDataJob()
}, getFirebaseRuntimeSecrets())

export const syncInstagramData = registerFirebaseScheduledFunction(async () => {
  await applyFirebaseRuntimeConfig()
  await syncInstagramDataJob()
}, getFirebaseRuntimeSecrets())

export const syncFlickrData = registerFirebaseScheduledFunction(async () => {
  await applyFirebaseRuntimeConfig()
  await syncFlickrDataJob(documentStore)
}, getFirebaseRuntimeSecrets())

export const handleUserCreation = registerFirebaseUserCreationTrigger(async (event) => {
  await applyFirebaseRuntimeConfig()
  const user = event.data
  if (!user) {
    logger.error('handleUserCreation: event.data missing')
    return
  }
  const result = await createUserJob(user)
  if (result.result !== 'SUCCESS') {
    logger.error('User creation trigger failed', { uid: user.uid, error: result.error })
  } else {
    logger.info('User creation trigger completed successfully', { uid: user.uid })
  }
}, getFirebaseRuntimeSecrets())

export const app = registerFirebaseHttpFunction(async (req, res) => {
  await applyFirebaseRuntimeConfig()
  expressApp(req, res)
}, getFirebaseRuntimeSecrets())
