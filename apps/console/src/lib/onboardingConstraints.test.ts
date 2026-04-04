import { describe, expect, it } from 'vitest'

import { ONBOARDING_USERNAME_PATTERN } from './onboardingConstraints'

/** Shared by onboarding and settings username checks before availability API calls. */
describe('ONBOARDING_USERNAME_PATTERN', () => {
  it('accepts typical slugs and boundary lengths', () => {
    expect(ONBOARDING_USERNAME_PATTERN.test('abc')).toBe(true)
    expect(ONBOARDING_USERNAME_PATTERN.test('a_b')).toBe(true)
    expect(ONBOARDING_USERNAME_PATTERN.test('a-b')).toBe(true)
    expect(ONBOARDING_USERNAME_PATTERN.test('a0z')).toBe(true)
    expect(ONBOARDING_USERNAME_PATTERN.test('a' + '0'.repeat(28) + 'z')).toBe(true)
  })

  it('rejects leading or trailing hyphen or underscore', () => {
    expect(ONBOARDING_USERNAME_PATTERN.test('_ab')).toBe(false)
    expect(ONBOARDING_USERNAME_PATTERN.test('ab_')).toBe(false)
    expect(ONBOARDING_USERNAME_PATTERN.test('-ab')).toBe(false)
    expect(ONBOARDING_USERNAME_PATTERN.test('ab-')).toBe(false)
  })

  it('rejects too-short or too-long values', () => {
    expect(ONBOARDING_USERNAME_PATTERN.test('ab')).toBe(false)
    expect(ONBOARDING_USERNAME_PATTERN.test('a' + '0'.repeat(29) + 'z')).toBe(false)
  })
})
