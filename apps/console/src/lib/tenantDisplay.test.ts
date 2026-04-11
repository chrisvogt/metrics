import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveDashboardTenantHostname } from './tenantDisplay'

describe('resolveDashboardTenantHostname', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_TENANT_DISPLAY_HOST', 'www.chrisvogt.me')
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_PUBLIC_API_HOST', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses customDomain when set', () => {
    expect(
      resolveDashboardTenantHostname({
        customDomain: 'https://api.customer.example',
        username: 'alice',
      })
    ).toBe('api.customer.example')
  })

  it('uses default public API host when username exists but no custom domain', () => {
    expect(
      resolveDashboardTenantHostname({
        customDomain: null,
        username: 'bob',
      })
    ).toBe('api.chronogrove.com')
  })

  it('respects NEXT_PUBLIC_DEFAULT_PUBLIC_API_HOST when username exists', () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_PUBLIC_API_HOST', 'api.example.org')
    expect(
      resolveDashboardTenantHostname({
        customDomain: null,
        username: 'bob',
      })
    ).toBe('api.example.org')
  })

  it('falls back to getTenantDisplayHost when no slug or domain', () => {
    expect(
      resolveDashboardTenantHostname({
        customDomain: null,
        username: null,
      })
    ).toBe('www.chrisvogt.me')
  })
})
