import { describe, expect, it, vi } from 'vitest'
import type express from 'express'

import { metricsCompressionFilter } from './create-express-app.js'

describe('metricsCompressionFilter', () => {
  it('disables compression for manual sync SSE paths', () => {
    const req = { path: '/api/widgets/sync/spotify/stream', url: undefined } as express.Request
    const defaultFilter = vi.fn(() => true)

    expect(metricsCompressionFilter(req, {} as express.Response, defaultFilter)).toBe(false)
    expect(defaultFilter).not.toHaveBeenCalled()
  })

  it('falls back to the default compression filter for other paths', () => {
    const req = { path: '/api/widgets/sync/spotify', url: undefined } as express.Request
    const defaultFilter = vi.fn(() => true)

    expect(metricsCompressionFilter(req, {} as express.Response, defaultFilter)).toBe(true)
    expect(defaultFilter).toHaveBeenCalledOnce()
  })

  it('uses req.url when path is undefined', () => {
    const req = { url: '/api/widgets/sync/discogs/stream' } as express.Request
    const defaultFilter = vi.fn(() => true)

    expect(metricsCompressionFilter(req, {} as express.Response, defaultFilter)).toBe(false)
  })

  it('uses the default filter when path and url are both missing (empty pathStr)', () => {
    const req = {} as express.Request
    const defaultFilter = vi.fn(() => true)

    expect(metricsCompressionFilter(req, {} as express.Response, defaultFilter)).toBe(true)
    expect(defaultFilter).toHaveBeenCalledOnce()
  })
})
