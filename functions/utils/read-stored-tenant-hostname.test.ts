import { describe, expect, it } from 'vitest'
import { readStoredTenantHostnameFromUserDoc } from './read-stored-tenant-hostname.js'

describe('readStoredTenantHostnameFromUserDoc', () => {
  it('prefers tenantHostname', () => {
    expect(
      readStoredTenantHostnameFromUserDoc({
        tenantHostname: 'API.PRIMARY.EXAMPLE.COM',
        onboardingProgress: { customDomain: 'legacy.example.com' },
      })
    ).toBe('api.primary.example.com')
  })

  it('falls back to legacy onboardingProgress.customDomain', () => {
    expect(
      readStoredTenantHostnameFromUserDoc({
        onboardingProgress: { customDomain: 'legacy.example.com' },
      })
    ).toBe('legacy.example.com')
  })

  it('falls back to tenantHostname', () => {
    expect(
      readStoredTenantHostnameFromUserDoc({
        tenantHostname: 'fallback.example.com',
      })
    ).toBe('fallback.example.com')
  })

  it('returns null when nothing set', () => {
    expect(readStoredTenantHostnameFromUserDoc({})).toBeNull()
  })

  it('ignores stale onboarding.draftCustomDomain', () => {
    expect(
      readStoredTenantHostnameFromUserDoc({
        onboarding: { draftCustomDomain: 'ignored.example.com' },
      })
    ).toBeNull()
  })
})
