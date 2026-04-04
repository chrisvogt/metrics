import { afterEach, describe, expect, it, vi } from 'vitest'

import { clearDnsVerificationTimers } from './clearDnsVerificationTimers'

describe('clearDnsVerificationTimers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('clears pending timeout and interval and nulls refs', () => {
    vi.useFakeTimers()

    const timeoutFn = vi.fn()
    const intervalFn = vi.fn()

    const dnsTimerRef = {
      current: setTimeout(timeoutFn, 5_000) as ReturnType<typeof setTimeout> | null,
    }
    const dnsPollingRef = {
      current: setInterval(intervalFn, 5_000) as ReturnType<typeof setInterval> | null,
    }

    clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })

    expect(dnsTimerRef.current).toBeNull()
    expect(dnsPollingRef.current).toBeNull()

    vi.advanceTimersByTime(20_000)
    expect(timeoutFn).not.toHaveBeenCalled()
    expect(intervalFn).not.toHaveBeenCalled()
  })

  it('does nothing harmful when refs are already null', () => {
    const dnsTimerRef = { current: null as ReturnType<typeof setTimeout> | null }
    const dnsPollingRef = { current: null as ReturnType<typeof setInterval> | null }

    expect(() => clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })).not.toThrow()
    expect(dnsTimerRef.current).toBeNull()
    expect(dnsPollingRef.current).toBeNull()
  })
})
