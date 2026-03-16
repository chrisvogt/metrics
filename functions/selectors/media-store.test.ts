import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('media-store selector', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('defaults to disk outside production', async () => {
    process.env.NODE_ENV = 'development'

    const { resolveMediaStoreBackend, isDiskMediaStoreSelected } = await import('./media-store.js')

    expect(resolveMediaStoreBackend()).toBe('disk')
    expect(isDiskMediaStoreSelected()).toBe(true)
  })

  it('defaults to gcs in production', async () => {
    process.env.NODE_ENV = 'production'

    const { resolveMediaStoreBackend, isDiskMediaStoreSelected } = await import('./media-store.js')

    expect(resolveMediaStoreBackend()).toBe('gcs')
    expect(isDiskMediaStoreSelected()).toBe(false)
  })

  it('prefers the explicit backend env var', async () => {
    process.env.NODE_ENV = 'development'
    process.env.MEDIA_STORE_BACKEND = 'gcs'

    const { resolveMediaStoreBackend, isDiskMediaStoreSelected } = await import('./media-store.js')

    expect(resolveMediaStoreBackend()).toBe('gcs')
    expect(isDiskMediaStoreSelected()).toBe(false)
  })

  it('returns the configured local media root', async () => {
    process.env.LOCAL_MEDIA_ROOT = '/tmp/custom-media'

    const { resolveLocalMediaRoot } = await import('./media-store.js')

    expect(resolveLocalMediaRoot()).toBe('/tmp/custom-media')
  })

  it('throws for unsupported backends instead of silently falling back to gcs', async () => {
    process.env.MEDIA_STORE_BACKEND = 's3'

    const { getMediaStore } = await import('./media-store.js')

    expect(() => getMediaStore()).toThrow('Unsupported media store backend: s3')
  })

  it('creates the gcs store when the gcs backend is selected', async () => {
    process.env.MEDIA_STORE_BACKEND = 'gcs'

    const { getMediaStore } = await import('./media-store.js')

    expect(getMediaStore().describe().backend).toBe('gcs')
  })

  it('caches the selected store until reset and then re-resolves from env', async () => {
    process.env.MEDIA_STORE_BACKEND = 'disk'
    process.env.LOCAL_MEDIA_ROOT = '/tmp/first-media-root'

    const { getMediaStore, resetMediaStoreForTests } = await import('./media-store.js')

    const initialStore = getMediaStore()
    const cachedStore = getMediaStore()
    expect(initialStore).toBe(cachedStore)
    expect(initialStore.describe()).toEqual({
      backend: 'disk',
      target: '/tmp/first-media-root',
    })

    process.env.LOCAL_MEDIA_ROOT = '/tmp/second-media-root'
    resetMediaStoreForTests()

    const resetStore = getMediaStore()
    expect(resetStore.describe().backend).toBe('disk')
    expect(resetStore).not.toBe(initialStore)
    expect(resetStore.describe().target).toBe('/tmp/second-media-root')
  })
})
