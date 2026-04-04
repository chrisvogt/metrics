import { afterEach, describe, expect, it } from 'vitest'
import express from 'express'

import {
  resolveDiscogsOAuthPublicOrigin,
  resolveDiscogsOAuthRedirectUrl,
} from './oauth-discogs.js'

function makeReq(partial: {
  headers?: express.Request['headers']
  get?: express.Request['get']
  protocol?: string
}): express.Request {
  return {
    headers: partial.headers ?? {},
    get: partial.get ?? (() => undefined),
    protocol: partial.protocol ?? 'http',
  } as express.Request
}

describe('oauth-discogs redirect helpers', () => {
  afterEach(() => {
    delete process.env.PUBLIC_APP_ORIGIN
  })

  it('resolveDiscogsOAuthPublicOrigin prefers PUBLIC_APP_ORIGIN and strips trailing slash', () => {
    process.env.PUBLIC_APP_ORIGIN = 'https://cfg.example/'
    const req = makeReq({})
    expect(resolveDiscogsOAuthPublicOrigin(req)).toBe('https://cfg.example')
  })

  it('resolveDiscogsOAuthPublicOrigin uses x-forwarded-host when present', () => {
    const req = makeReq({
      headers: {
        'x-forwarded-host': 'fwd.example',
        'x-forwarded-proto': 'https',
      },
      protocol: 'http',
    })
    expect(resolveDiscogsOAuthPublicOrigin(req)).toBe('https://fwd.example')
  })

  it('resolveDiscogsOAuthPublicOrigin falls back to Host then localhost', () => {
    const noHost = makeReq({ headers: {}, get: () => undefined, protocol: 'http' })
    expect(resolveDiscogsOAuthPublicOrigin(noHost)).toBe('http://localhost')

    const withHost = makeReq({
      headers: {},
      get: (name: string) => (name === 'host' ? 'app.internal:8080' : undefined),
      protocol: 'http',
    })
    expect(resolveDiscogsOAuthPublicOrigin(withHost)).toBe('http://app.internal:8080')
  })

  it('resolveDiscogsOAuthPublicOrigin uses req.protocol when forwarded-proto is absent', () => {
    const req = makeReq({
      headers: {},
      get: (name: string) => (name === 'host' ? 't' : undefined),
      protocol: 'https',
    })
    expect(resolveDiscogsOAuthPublicOrigin(req)).toBe('https://t')
  })

  it('resolveDiscogsOAuthRedirectUrl returns absolute targets unchanged', () => {
    const req = makeReq({})
    expect(resolveDiscogsOAuthRedirectUrl(req, 'https://elsewhere/')).toBe('https://elsewhere/')
  })

  it('resolveDiscogsOAuthRedirectUrl resolves relative targets against public origin', () => {
    const req = makeReq({
      get: (name: string) => (name === 'host' ? 'only.host' : undefined),
      protocol: 'http',
    })
    expect(resolveDiscogsOAuthRedirectUrl(req, '/a')).toBe('http://only.host/a')
    expect(resolveDiscogsOAuthRedirectUrl(req, 'no-slash')).toBe('http://only.host/no-slash')
  })
})
