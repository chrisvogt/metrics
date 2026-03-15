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
})
