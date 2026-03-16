import admin from 'firebase-admin'
import { logger as firebaseLogger } from 'firebase-functions'
import path from 'path'
import { fileURLToPath } from 'url'

import { FirebaseAuthService } from '../adapters/auth/firebase-auth-service.js'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import {
  getClientAuthConfig,
  getStorageConfig,
  isProductionEnvironment,
} from '../config/backend-config.js'
import {
  bootstrapLocalRuntimeEnv,
  ensureRuntimeConfigApplied,
} from '../config/runtime-config.js'
import type { Clock } from '../ports/clock.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { MediaStore } from '../ports/media-store.js'
import type { RuntimePlatform } from '../ports/runtime-platform.js'
import { configureClock } from '../services/clock.js'
import { configureLogger } from '../services/logger.js'
import {
  configureMediaService,
  createMediaService,
  type MediaService,
} from '../services/media/media-service.js'
import { getMediaStore, resetMediaStoreForTests } from '../selectors/media-store.js'
import { getSelectedProviders } from './provider-selection.js'
import {
  firebaseRuntimeConfigSource,
  getFirebaseFirestoreDatabaseUrl,
  getFirebaseRuntimeSecrets,
} from '../runtime/firebase-runtime-config.js'
import { initializeFirebaseAdminRuntime } from '../runtime/firebase-admin-runtime.js'
import {
  registerFirebaseHttpFunction,
  registerFirebaseScheduledFunction,
  registerFirebaseUserCreationTrigger,
} from '../runtime/firebase-functions-runtime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const systemClock: Clock = {
  now: () => new Date(),
}

const firebaseRuntimePlatform: RuntimePlatform = {
  registerHttpFunction: registerFirebaseHttpFunction,
  registerScheduledFunction: registerFirebaseScheduledFunction,
  registerUserCreationTrigger: registerFirebaseUserCreationTrigger,
}

export interface BackendBootstrap {
  authService: FirebaseAuthService
  clock: Clock
  documentStore: DocumentStore
  ensureRuntimeConfigApplied: () => Promise<void>
  getClientAuthConfig: () => Record<string, string | undefined>
  logger: typeof firebaseLogger
  mediaService: MediaService
  mediaStore: MediaStore
  runtimePlatform: RuntimePlatform
  runtimeSecrets: unknown[]
}

export const createBackendBootstrap = (): BackendBootstrap => {
  bootstrapLocalRuntimeEnv(path.resolve(__dirname, '../.env'))

  const selectedProviders = getSelectedProviders()

  initializeFirebaseAdminRuntime({
    admin,
    databaseURL: getFirebaseFirestoreDatabaseUrl(),
    isProduction: isProductionEnvironment(),
    projectId: 'personal-stats-chrisvogt',
  })

  resetMediaStoreForTests()
  process.env.MEDIA_STORE_BACKEND = selectedProviders.mediaStoreProvider

  const clock = systemClock
  const logger = firebaseLogger
  const documentStore = new FirestoreDocumentStore()
  const authService = new FirebaseAuthService(admin)
  const mediaStore = getMediaStore()
  const mediaService = createMediaService(mediaStore, getStorageConfig().mediaPublicBaseUrl)
  const runtimeSecrets = getFirebaseRuntimeSecrets()

  configureClock(clock)
  configureLogger(logger)
  configureMediaService(mediaService)

  return {
    authService,
    clock,
    documentStore,
    ensureRuntimeConfigApplied: () =>
      ensureRuntimeConfigApplied(firebaseRuntimeConfigSource, logger.warn),
    getClientAuthConfig,
    logger,
    mediaService,
    mediaStore,
    runtimePlatform: firebaseRuntimePlatform,
    runtimeSecrets,
  }
}
