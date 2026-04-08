import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

describe('getServerWidgetFetchOrigin', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses IPv4 emulator URL in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe(
      'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app'
    )
  })

  it('trims INTERNAL_FUNCTIONS_EMULATOR_APP_ORIGIN', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv(
      'INTERNAL_FUNCTIONS_EMULATOR_APP_ORIGIN',
      'http://127.0.0.1:9999/my-proj/us-central1/app/'
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe(
      'http://127.0.0.1:9999/my-proj/us-central1/app'
    )
  })

  it('builds origin from headers in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'api.chronogrove.com',
        'x-forwarded-proto': 'https',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('https://api.chronogrove.com')
  })

  it('uses http for .local host when proto is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'api.chrisvogt.local:5173',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('http://api.chrisvogt.local:5173')
  })

  it('falls back to localhost:5173 when host headers are missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(new Headers() as Headers)
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('http://localhost:5173')
  })
})
