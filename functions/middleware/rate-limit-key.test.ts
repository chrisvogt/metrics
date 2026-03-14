import { describe, it, expect } from 'vitest'
import type { Request } from 'express'

import { getRateLimitKey } from './rate-limit-key.js'

function createRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: undefined,
    method: 'GET',
    path: '/api/widgets/sync/flickr',
    socket: {},
    ...overrides,
  } as Request
}

describe('getRateLimitKey', () => {
  it('prefers req.ip when available', () => {
    const req = createRequest({
      ip: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.10' },
      socket: { remoteAddress: '10.0.0.1' } as Request['socket'],
    })

    expect(getRateLimitKey(req)).toBe('127.0.0.1')
  })

  it('falls back to x-forwarded-for when req.ip is undefined', () => {
    const req = createRequest({
      headers: { 'x-forwarded-for': '203.0.113.10, 70.41.3.18' },
      socket: { remoteAddress: '10.0.0.1' } as Request['socket'],
    })

    expect(getRateLimitKey(req)).toBe('203.0.113.10')
  })

  it('falls back to socket remote address when headers are unavailable', () => {
    const req = createRequest({
      socket: { remoteAddress: '10.0.0.1' } as Request['socket'],
    })

    expect(getRateLimitKey(req)).toBe('10.0.0.1')
  })

  it('uses a deterministic local fallback when no address is present', () => {
    const req = createRequest({
      method: 'POST',
      path: '/api/widgets/sync/spotify',
    })

    expect(getRateLimitKey(req)).toBe('POST:/api/widgets/sync/spotify:local-dev')
  })
})
