import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isDevApiHost } from './baseUrl.js'

/** Stand-in for a deployed operator hostname (not localhost / App Hosting emulator). */
const TEST_PRODUCTION_LIKE_APP_HOSTNAME = 'console.chronogrove.com' as const

describe('isDevApiHost', () => {
  it('returns true for local and dev hostnames', () => {
    expect(isDevApiHost('localhost')).toBe(true)
    expect(isDevApiHost('127.0.0.1')).toBe(true)
    expect(isDevApiHost('metrics.dev-chrisvogt.me')).toBe(true)
  })

  it('returns false for production-like hostnames', () => {
    expect(isDevApiHost(TEST_PRODUCTION_LIKE_APP_HOSTNAME)).toBe(false)
    expect(isDevApiHost('example.com')).toBe(false)
  })
})

describe('getAppBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns empty string when window is undefined (SSR)', async () => {
    vi.stubGlobal('window', undefined)
    const { getAppBaseUrl } = await import('./baseUrl.js')
    expect(getAppBaseUrl()).toBe('')
  })

  it('returns empty string for dev hostnames (same-origin /api)', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    const { getAppBaseUrl } = await import('./baseUrl.js')
    expect(getAppBaseUrl()).toBe('')
  })

  it('returns empty string for production hostnames (same-origin /api)', async () => {
    vi.stubGlobal('window', { location: { hostname: TEST_PRODUCTION_LIKE_APP_HOSTNAME } })
    const { getAppBaseUrl } = await import('./baseUrl.js')
    expect(getAppBaseUrl()).toBe('')
  })
})

describe('getSyncStreamBaseUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns empty string when window is undefined', async () => {
    vi.stubGlobal('window', undefined)
    const { getSyncStreamBaseUrl } = await import('./baseUrl.js')
    expect(getSyncStreamBaseUrl()).toBe('')
  })

  it('returns empty string for dev hostnames', async () => {
    vi.stubGlobal('window', { location: { hostname: 'metrics.dev-chrisvogt.me' } })
    const { getSyncStreamBaseUrl } = await import('./baseUrl.js')
    expect(getSyncStreamBaseUrl()).toBe('')
  })

  it('returns Cloud Functions origin in production when env is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', 'https://us-central1-x.cloudfunctions.net/app')
    vi.stubGlobal('window', { location: { hostname: TEST_PRODUCTION_LIKE_APP_HOSTNAME } })
    const { getSyncStreamBaseUrl } = await import('./baseUrl.js')
    expect(getSyncStreamBaseUrl()).toBe('https://us-central1-x.cloudfunctions.net/app')
  })

  it('returns empty string when env is unset in production (nullish coalescing)', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', undefined as unknown as string)
    vi.stubGlobal('window', { location: { hostname: TEST_PRODUCTION_LIKE_APP_HOSTNAME } })
    const { getSyncStreamBaseUrl } = await import('./baseUrl.js')
    expect(getSyncStreamBaseUrl()).toBe('')
  })
})

describe('getManualSyncStreamUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds a relative path in dev', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    const { getManualSyncStreamUrl } = await import('./baseUrl.js')
    expect(getManualSyncStreamUrl('spotify')).toBe('/api/widgets/sync/spotify/stream')
  })

  it('builds an absolute URL in production', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN',
      'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app',
    )
    vi.stubGlobal('window', { location: { hostname: TEST_PRODUCTION_LIKE_APP_HOSTNAME } })
    const { getManualSyncStreamUrl } = await import('./baseUrl.js')
    expect(getManualSyncStreamUrl('discogs')).toBe(
      'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app/api/widgets/sync/discogs/stream',
    )
  })
})
