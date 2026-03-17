import { describe, expect, it, vi } from 'vitest'

import { configureLogger, getLogger } from './logger.js'

describe('logger service', () => {
  it('returns the configured logger when one is provided', () => {
    const configuredLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }

    configureLogger(configuredLogger)

    expect(getLogger()).toBe(configuredLogger)
  })
})
