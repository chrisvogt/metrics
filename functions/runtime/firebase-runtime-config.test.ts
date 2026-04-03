import { beforeEach, describe, expect, it, vi } from 'vitest'

const defineJsonSecretMock = vi.hoisted(() => vi.fn())
const defineSecretMock = vi.hoisted(() => vi.fn())
const defineStringMock = vi.hoisted(() => vi.fn())
const applyExportedConfigToEnvMock = vi.hoisted(() => vi.fn())

vi.mock('firebase-functions/params', () => ({
  defineJsonSecret: defineJsonSecretMock,
  defineSecret: defineSecretMock,
  defineString: defineStringMock,
}))

vi.mock('../config/exported-config.js', () => ({
  applyExportedConfigToEnv: applyExportedConfigToEnvMock,
}))

describe('firebase runtime config', () => {
  beforeEach(() => {
    vi.resetModules()
    defineStringMock.mockReturnValue('mock-database-url')
    defineJsonSecretMock.mockReturnValue({
      value: vi.fn(() => ({ auth: { client_api_key: 'secret-key' } })),
    })
    defineSecretMock.mockReturnValue({})
    applyExportedConfigToEnvMock.mockReset()
  })

  it('exposes the Firebase Firestore database url param value', async () => {
    const { getFirebaseFirestoreDatabaseUrl } = await import('./firebase-runtime-config.js')

    expect(getFirebaseFirestoreDatabaseUrl()).toBe('mock-database-url')
    expect(defineStringMock).toHaveBeenCalledWith('STORAGE_FIRESTORE_DATABASE_URL')
  })

  it('reads the Firebase Firestore database url from a StringParam when available', async () => {
    const value = vi.fn(() => 'mock-param-value')
    defineStringMock.mockReturnValueOnce({ value })

    const { getFirebaseFirestoreDatabaseUrl } = await import('./firebase-runtime-config.js')

    expect(getFirebaseFirestoreDatabaseUrl()).toBe('mock-param-value')
    expect(value).toHaveBeenCalledTimes(1)
  })

  it('exposes the Firebase runtime secrets for trigger wiring', async () => {
    const configSecret = { value: vi.fn(() => ({})) }
    const integrationSecret = { id: 'integration-token-key' }
    defineJsonSecretMock.mockReturnValueOnce(configSecret)
    defineSecretMock.mockReturnValueOnce(integrationSecret)

    const { getFirebaseRuntimeSecrets } = await import('./firebase-runtime-config.js')

    expect(getFirebaseRuntimeSecrets()).toEqual([configSecret, integrationSecret])
    expect(defineJsonSecretMock).toHaveBeenCalledWith('FUNCTIONS_CONFIG_EXPORT')
    expect(defineSecretMock).toHaveBeenCalledWith('INTEGRATION_TOKEN_MASTER_KEY')
  })

  it('loads and applies exported Firebase config through the runtime source', async () => {
    const secretValue = { auth: { client_api_key: 'secret-key' } }
    defineJsonSecretMock.mockReturnValueOnce({
      value: vi.fn(() => secretValue),
    })

    const { firebaseRuntimeConfigSource } = await import('./firebase-runtime-config.js')

    expect(await firebaseRuntimeConfigSource.load()).toEqual(secretValue)
    firebaseRuntimeConfigSource.applyToEnv(secretValue)
    expect(applyExportedConfigToEnvMock).toHaveBeenCalledWith(secretValue)
  })
})
