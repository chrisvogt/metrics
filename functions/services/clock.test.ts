import { describe, expect, it } from 'vitest'

import { configureClock, getClock } from './clock.js'

describe('clock service', () => {
  it('returns the configured clock when one is provided', () => {
    const configuredClock = {
      now: () => new Date('2026-03-16T00:00:00.000Z'),
    }

    configureClock(configuredClock)

    expect(getClock()).toBe(configuredClock)
    expect(getClock().now()).toEqual(new Date('2026-03-16T00:00:00.000Z'))
  })
})
