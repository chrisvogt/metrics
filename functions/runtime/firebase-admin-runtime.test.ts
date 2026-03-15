import { beforeEach, describe, expect, it, vi } from 'vitest'

const connectFirebaseAdminEmulatorsMock = vi.hoisted(() => vi.fn())
const existsSyncMock = vi.hoisted(() => vi.fn(() => false))
const readFileSyncMock = vi.hoisted(() => vi.fn(() => JSON.stringify({ project_id: 'local-project' })))

vi.mock('./firebase-admin-emulators.js', () => ({
  connectFirebaseAdminEmulators: connectFirebaseAdminEmulatorsMock,
}))

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
}))

describe('firebase-admin-runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    existsSyncMock.mockReturnValue(false)
  })

  it('initializes Firebase Admin with ADC in production', async () => {
    const { initializeFirebaseAdminRuntime } = await import('./firebase-admin-runtime.js')
    const applicationDefault = vi.fn(() => ({ credential: 'adc' }))
    const initializeApp = vi.fn()
    const firestoreSettings = vi.fn()
    const firestore = vi.fn(() => ({ settings: firestoreSettings }))
    const auth = vi.fn()

    initializeFirebaseAdminRuntime({
      admin: {
        auth,
        credential: {
          applicationDefault,
          cert: vi.fn(),
        },
        firestore,
        initializeApp,
      },
      databaseURL: 'https://database.example.com',
      isProduction: true,
      projectId: 'metrics-project',
    })

    expect(applicationDefault).toHaveBeenCalledTimes(1)
    expect(initializeApp).toHaveBeenCalledWith({
      credential: { credential: 'adc' },
      databaseURL: 'https://database.example.com',
      projectId: 'metrics-project',
    })
    expect(connectFirebaseAdminEmulatorsMock).not.toHaveBeenCalled()
    expect(firestoreSettings).toHaveBeenCalledWith({
      ignoreUndefinedProperties: true,
    })
  })

  it('uses token.json and connects emulators in non-production environments', async () => {
    const { initializeFirebaseAdminRuntime } = await import('./firebase-admin-runtime.js')
    const cert = vi.fn(() => ({ credential: 'local-cert' }))
    const initializeApp = vi.fn()
    const firestoreSettings = vi.fn()
    const firestore = vi.fn(() => ({ settings: firestoreSettings }))
    const auth = vi.fn()
    const log = vi.fn()

    existsSyncMock.mockReturnValue(true)

    initializeFirebaseAdminRuntime({
      admin: {
        auth,
        credential: {
          applicationDefault: vi.fn(),
          cert,
        },
        firestore,
        initializeApp,
      },
      databaseURL: 'https://database.example.com',
      isProduction: false,
      log,
      projectId: 'metrics-project',
    })

    expect(readFileSyncMock).toHaveBeenCalledWith('./token.json', 'utf8')
    expect(cert).toHaveBeenCalledWith({ project_id: 'local-project' })
    expect(connectFirebaseAdminEmulatorsMock).toHaveBeenCalledTimes(1)
    expect(connectFirebaseAdminEmulatorsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth,
        firestore,
      }),
      log
    )
  })
})
