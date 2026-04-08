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

  it('prefers Cloud Functions app origin in production when set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(
      'NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN',
      'https://us-central1-myproj.cloudfunctions.net/app/'
    )
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'api.chronogrove.com',
        'x-forwarded-proto': 'https',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe(
      'https://us-central1-myproj.cloudfunctions.net/app'
    )
  })

  it('builds origin from headers in production when Cloud Functions origin unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', '')
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

  it('prefers SERVER_WIDGET_FETCH_ORIGIN over NEXT_PUBLIC when both set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', 'https://us-central1-x.cloudfunctions.net/app')
    vi.stubEnv('SERVER_WIDGET_FETCH_ORIGIN', 'https://custom-internal.example/app/')
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('https://custom-internal.example/app')
  })

  it('uses http for .local host when proto is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', '')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'api.chrisvogt.local:5173',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('http://api.chrisvogt.local:5173')
  })

  it('uses http for localhost when proto is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', '')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        host: 'localhost:3000',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('http://localhost:3000')
  })

  it('uses first x-forwarded-host segment when multiple hosts are listed', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', '')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(
      new Headers({
        'x-forwarded-host': 'api.customer.example, proxy.internal',
        'x-forwarded-proto': 'https',
      }) as Headers
    )
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('https://api.customer.example')
  })

  it('falls back to localhost:5173 when host headers are missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', '')
    const { headers } = await import('next/headers')
    vi.mocked(headers).mockResolvedValue(new Headers() as Headers)
    const { getServerWidgetFetchOrigin } = await import('./server-widget-fetch-origin.js')
    await expect(getServerWidgetFetchOrigin()).resolves.toBe('http://localhost:5173')
  })
})
