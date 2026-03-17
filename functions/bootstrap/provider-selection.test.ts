import { afterEach, describe, expect, it, vi } from 'vitest'

const isProductionEnvironmentMock = vi.hoisted(() => vi.fn(() => false))

vi.mock('../config/backend-config.js', () => ({
  isProductionEnvironment: isProductionEnvironmentMock,
}))

describe('provider selection', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    isProductionEnvironmentMock.mockReturnValue(false)
  })

  it('uses firebase and firestore defaults while preferring disk media locally', async () => {
    const { getSelectedProviders } = await import('./provider-selection.js')

    expect(getSelectedProviders()).toEqual({
      authProvider: 'firebase',
      configProvider: 'firebase',
      documentStoreProvider: 'firestore',
      mediaStoreProvider: 'disk',
      runtimePlatformProvider: 'firebase',
    })
  })

  it('prefers gcs media in production by default', async () => {
    isProductionEnvironmentMock.mockReturnValue(true)
    const { getSelectedProviders } = await import('./provider-selection.js')

    expect(getSelectedProviders().mediaStoreProvider).toBe('gcs')
  })

  it('respects supported provider overrides from env', async () => {
    process.env.AUTH_PROVIDER = 'firebase'
    process.env.CONFIG_PROVIDER = 'firebase'
    process.env.DOCUMENT_STORE_PROVIDER = 'firestore'
    process.env.MEDIA_STORE_PROVIDER = 'gcs'
    process.env.RUNTIME_PLATFORM = 'firebase'
    const { getSelectedProviders } = await import('./provider-selection.js')

    expect(getSelectedProviders()).toEqual({
      authProvider: 'firebase',
      configProvider: 'firebase',
      documentStoreProvider: 'firestore',
      mediaStoreProvider: 'gcs',
      runtimePlatformProvider: 'firebase',
    })
  })

  it('throws for unsupported provider values', async () => {
    process.env.MEDIA_STORE_PROVIDER = 's3'
    const { getSelectedProviders } = await import('./provider-selection.js')

    expect(() => getSelectedProviders()).toThrow(
      'Unsupported MEDIA_STORE_PROVIDER value: s3. Supported values: disk, gcs'
    )
  })
})
