import { describe, expect, it } from 'vitest'

import { hasCompletedUsernameSelection } from './onboardingUsernameCompletion'

describe('hasCompletedUsernameSelection', () => {
  it('is true when username step is in completedSteps', () => {
    expect(
      hasCompletedUsernameSelection({
        username: null,
        completedSteps: ['username'],
      })
    ).toBe(true)
  })

  it('is true when username slug is persisted', () => {
    expect(
      hasCompletedUsernameSelection({
        username: 'my-slug',
        completedSteps: [],
      })
    ).toBe(true)
  })

  it('is false for a brand-new payload', () => {
    expect(
      hasCompletedUsernameSelection({
        username: null,
        completedSteps: [],
      })
    ).toBe(false)
  })
})
