import { describe, expect, it } from 'vitest'

import { isPublicStatusSurfaceWithOptionalFirestoreTenant } from './authless-tenant-surface'

describe('isPublicStatusSurfaceWithOptionalFirestoreTenant', () => {
  it('returns true when base authless surface applies', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/u/bob', 'any', null, true)
    ).toBe(true)
  })

  it('returns false for / on unknown host when slug missing', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/', 'console.example', null, true)
    ).toBe(false)
  })

  it('returns true for / when Firestore slug is present and flag on', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/', 'api.tenant.example', 'alice', true)
    ).toBe(true)
  })

  it('returns false when Firestore flag is off even with slug', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/', 'api.tenant.example', 'alice', false)
    ).toBe(false)
  })

  it('returns false when pathname is not root', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/auth', 'api.tenant.example', 'alice', true)
    ).toBe(false)
  })

  it('returns false when hostname missing', () => {
    expect(
      isPublicStatusSurfaceWithOptionalFirestoreTenant('/', undefined, 'alice', true)
    ).toBe(false)
  })
})
