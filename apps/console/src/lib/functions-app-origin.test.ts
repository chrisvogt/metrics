import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('serverFunctionsAppOrigin', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.TENANT_RESOLVE_FUNCTIONS_ORIGIN
    delete process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('prefers TENANT_RESOLVE_FUNCTIONS_ORIGIN and strips trailing slash', async () => {
    process.env.TENANT_RESOLVE_FUNCTIONS_ORIGIN = 'https://custom.example/app/'
    const { serverFunctionsAppOrigin } = await import('./functions-app-origin')
    expect(serverFunctionsAppOrigin()).toBe('https://custom.example/app')
  })

  it('falls back to NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN', async () => {
    process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN = 'https://pub.example/app/'
    const { serverFunctionsAppOrigin } = await import('./functions-app-origin')
    expect(serverFunctionsAppOrigin()).toBe('https://pub.example/app')
  })

  it('uses emulator URL in non-production when unset', async () => {
    process.env.NODE_ENV = 'development'
    const { serverFunctionsAppOrigin } = await import('./functions-app-origin')
    expect(serverFunctionsAppOrigin()).toBe(
      'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app'
    )
  })

  it('uses default cloud URL in production when unset', async () => {
    process.env.NODE_ENV = 'production'
    const { serverFunctionsAppOrigin } = await import('./functions-app-origin')
    expect(serverFunctionsAppOrigin()).toBe(
      'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app'
    )
  })
})
