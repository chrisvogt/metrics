import { beforeEach, describe, expect, it, vi } from 'vitest'

const bootstrapLocalRuntimeEnvMock = vi.hoisted(() => vi.fn())
const ensureRuntimeConfigAppliedMock = vi.hoisted(() => vi.fn())
const getSelectedProvidersMock = vi.hoisted(() =>
  vi.fn(() => ({
    authProvider: 'firebase',
    configProvider: 'firebase',
    documentStoreProvider: 'firestore',
    mediaStoreProvider: 'gcs',
    runtimePlatformProvider: 'firebase',
  }))
)
const initializeFirebaseAdminRuntimeMock = vi.hoisted(() => vi.fn())
const getFirebaseFirestoreDatabaseUrlMock = vi.hoisted(() => vi.fn(() => 'mock-database-url'))
const getFirebaseRuntimeSecretsMock = vi.hoisted(() => vi.fn(() => ['secret']))
const resetMediaStoreForTestsMock = vi.hoisted(() => vi.fn())
const getMediaStoreMock = vi.hoisted(() =>
  vi.fn(() => ({
    describe: vi.fn(() => ({ backend: 'gcs', target: 'bucket' })),
    fetchAndStore: vi.fn(),
    listFiles: vi.fn(),
  }))
)
const configureClockMock = vi.hoisted(() => vi.fn())
const configureLoggerMock = vi.hoisted(() => vi.fn())
const getClientAuthConfigMock = vi.hoisted(() =>
  vi.fn(() => ({ apiKey: 'public-key', authDomain: 'auth.test', projectId: 'project-id' }))
)
const isProductionEnvironmentMock = vi.hoisted(() => vi.fn(() => false))
const registerFirebaseHttpFunctionMock = vi.hoisted(() => vi.fn())
const registerFirebaseScheduledFunctionMock = vi.hoisted(() => vi.fn())
const registerFirebaseUserCreationTriggerMock = vi.hoisted(() => vi.fn())

const firebaseLoggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}))

const adminModuleMock = vi.hoisted(() => ({ auth: vi.fn(), firestore: vi.fn(), initializeApp: vi.fn() }))

const firestoreDocumentStoreCtorMock = vi.hoisted(() =>
  vi.fn(function MockFirestoreDocumentStore(this: object) {})
)
const firebaseAuthServiceCtorMock = vi.hoisted(() =>
  vi.fn(function MockFirebaseAuthService(this: object, _admin: unknown) {})
)

vi.mock('firebase-admin', () => ({
  default: adminModuleMock,
}))

vi.mock('firebase-functions', () => ({
  logger: firebaseLoggerMock,
}))

vi.mock('../config/runtime-config.js', () => ({
  bootstrapLocalRuntimeEnv: bootstrapLocalRuntimeEnvMock,
  ensureRuntimeConfigApplied: ensureRuntimeConfigAppliedMock,
}))

vi.mock('../config/backend-config.js', () => ({
  getClientAuthConfig: getClientAuthConfigMock,
  isProductionEnvironment: isProductionEnvironmentMock,
}))

vi.mock('./provider-selection.js', () => ({
  getSelectedProviders: getSelectedProvidersMock,
}))

vi.mock('../runtime/firebase-runtime-config.js', () => ({
  firebaseRuntimeConfigSource: { name: 'firebase-config-source' },
  getFirebaseFirestoreDatabaseUrl: getFirebaseFirestoreDatabaseUrlMock,
  getFirebaseRuntimeSecrets: getFirebaseRuntimeSecretsMock,
}))

vi.mock('../runtime/firebase-admin-runtime.js', () => ({
  initializeFirebaseAdminRuntime: initializeFirebaseAdminRuntimeMock,
}))

vi.mock('../runtime/firebase-functions-runtime.js', () => ({
  registerFirebaseHttpFunction: registerFirebaseHttpFunctionMock,
  registerFirebaseScheduledFunction: registerFirebaseScheduledFunctionMock,
  registerFirebaseUserCreationTrigger: registerFirebaseUserCreationTriggerMock,
}))

vi.mock('../selectors/media-store.js', () => ({
  getMediaStore: getMediaStoreMock,
  resetMediaStoreForTests: resetMediaStoreForTestsMock,
}))

vi.mock('../services/clock.js', () => ({
  configureClock: configureClockMock,
}))

vi.mock('../services/logger.js', () => ({
  configureLogger: configureLoggerMock,
}))

vi.mock('../adapters/storage/firestore-document-store.js', () => ({
  FirestoreDocumentStore: firestoreDocumentStoreCtorMock,
}))

vi.mock('../adapters/auth/firebase-auth-service.js', () => ({
  FirebaseAuthService: firebaseAuthServiceCtorMock,
}))

describe('createBackendBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MEDIA_STORE_BACKEND = 'disk'
    ensureRuntimeConfigAppliedMock.mockResolvedValue(undefined)
  })

  it('assembles the backend bootstrap from the selected Firebase adapters', async () => {
    const { createBackendBootstrap } = await import('./create-backend-bootstrap.js')

    const bootstrap = createBackendBootstrap()

    expect(bootstrapLocalRuntimeEnvMock).toHaveBeenCalledTimes(1)
    expect(getSelectedProvidersMock).toHaveBeenCalledTimes(1)
    expect(initializeFirebaseAdminRuntimeMock).toHaveBeenCalledWith({
      admin: adminModuleMock,
      databaseURL: 'mock-database-url',
      isProduction: false,
      projectId: 'personal-stats-chrisvogt',
    })
    expect(resetMediaStoreForTestsMock).toHaveBeenCalledTimes(1)
    expect(process.env.MEDIA_STORE_BACKEND).toBe('gcs')
    expect(firestoreDocumentStoreCtorMock).toHaveBeenCalledTimes(1)
    expect(firebaseAuthServiceCtorMock).toHaveBeenCalledWith(adminModuleMock)
    expect(configureClockMock).toHaveBeenCalledWith(bootstrap.clock)
    expect(configureLoggerMock).toHaveBeenCalledWith(firebaseLoggerMock)
    expect(bootstrap.resolveMediaStore).toBe(getMediaStoreMock)
    expect(bootstrap.getClientAuthConfig()).toEqual({
      apiKey: 'public-key',
      authDomain: 'auth.test',
      projectId: 'project-id',
    })
    expect(bootstrap.runtimeSecrets).toEqual(['secret'])
    expect(bootstrap.logger).toBe(firebaseLoggerMock)
    expect(bootstrap.runtimePlatform.registerHttpFunction).toBe(registerFirebaseHttpFunctionMock)
    expect(bootstrap.runtimePlatform.registerScheduledFunction).toBe(
      registerFirebaseScheduledFunctionMock
    )
    expect(bootstrap.runtimePlatform.registerUserCreationTrigger).toBe(
      registerFirebaseUserCreationTriggerMock
    )
    expect(bootstrap.clock.now()).toBeInstanceOf(Date)
  })

  it('delegates runtime config application through the configured source and logger warn', async () => {
    const { createBackendBootstrap } = await import('./create-backend-bootstrap.js')

    const bootstrap = createBackendBootstrap()

    await bootstrap.ensureRuntimeConfigApplied()

    expect(ensureRuntimeConfigAppliedMock).toHaveBeenCalledWith(
      { name: 'firebase-config-source' },
      firebaseLoggerMock.warn
    )
  })
})
