import { afterEach, describe, expect, it } from 'vitest'

import { getOnboardingCnameTarget } from './onboardingCnameTarget'

describe('getOnboardingCnameTarget', () => {
  const original = process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET
    } else {
      process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET = original
    }
  })

  it('returns the default App Hosting hostname when env is unset', () => {
    delete process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET
    expect(getOnboardingCnameTarget()).toBe('personal-stats-chrisvogt.web.app')
  })

  it('returns env override when set', () => {
    process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET = 'api.chronogrove.com'
    expect(getOnboardingCnameTarget()).toBe('api.chronogrove.com')
  })
})
