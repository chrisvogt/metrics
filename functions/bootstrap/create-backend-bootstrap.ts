import admin from 'firebase-admin'
import { existsSync } from 'fs'
import { logger as firebaseLogger } from 'firebase-functions'
import path from 'path'
import { fileURLToPath } from 'url'

import { FirebaseAuthService } from '../adapters/auth/firebase-auth-service.js'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import {
  getClientAuthConfig,
  isProductionEnvironment,
} from '../config/backend-config.js'
import {
  bootstrapLocalRuntimeEnv,
  ensureRuntimeConfigApplied,
} from '../config/runtime-config.js'
import type { Clock } from '../ports/clock.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { RuntimePlatform } from '../ports/runtime-platform.js'
import { configureClock } from '../services/clock.js'
import { configureLogger } from '../services/logger.js'
import { resetMediaStoreForTests, getMediaStore } from '../selectors/media-store.js'
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
  resolveMediaStore: typeof getMediaStore
  runtimePlatform: RuntimePlatform
  runtimeSecrets: ReturnType<typeof getFirebaseRuntimeSecrets>
}

const resolveLocalEnvPath = (): string => {
  const candidates = [
    path.resolve(process.cwd(), 'functions/.env.local'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), 'functions/.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env.local'),
    path.resolve(__dirname, '../../functions/.env.local'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../functions/.env'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

export const createBackendBootstrap = (): BackendBootstrap => {
  bootstrapLocalRuntimeEnv(resolveLocalEnvPath())

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
  const runtimeSecrets = getFirebaseRuntimeSecrets()

  configureClock(clock)
  configureLogger(logger)

  return {
    authService,
    clock,
    documentStore,
    ensureRuntimeConfigApplied: () =>
      ensureRuntimeConfigApplied(firebaseRuntimeConfigSource, logger.warn),
    getClientAuthConfig,
    logger,
    resolveMediaStore: getMediaStore,
    runtimePlatform: firebaseRuntimePlatform,
    runtimeSecrets,
  }
}
