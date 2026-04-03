import { describe, expect, it, afterEach } from 'vitest'
import express from 'express'

import {
  resolveFlickrOAuthPublicOrigin,
  resolveFlickrOAuthRedirectUrl,
} from './oauth-flickr.js'

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

describe('oauth-flickr redirect helpers', () => {
  afterEach(() => {
    delete process.env.PUBLIC_APP_ORIGIN
  })

  it('resolveFlickrOAuthPublicOrigin prefers PUBLIC_APP_ORIGIN and strips trailing slash', () => {
    process.env.PUBLIC_APP_ORIGIN = 'https://cfg.example/'
    const req = makeReq({})
    expect(resolveFlickrOAuthPublicOrigin(req)).toBe('https://cfg.example')
  })

  it('resolveFlickrOAuthPublicOrigin uses x-forwarded-host when present', () => {
    const req = makeReq({
      headers: {
        'x-forwarded-host': 'fwd.example',
        'x-forwarded-proto': 'https',
      },
      protocol: 'http',
    })
    expect(resolveFlickrOAuthPublicOrigin(req)).toBe('https://fwd.example')
  })

  it('resolveFlickrOAuthPublicOrigin falls back to Host then localhost', () => {
    const noHost = makeReq({ headers: {}, get: () => undefined, protocol: 'http' })
    expect(resolveFlickrOAuthPublicOrigin(noHost)).toBe('http://localhost')

    const withHost = makeReq({
      headers: {},
      get: (name: string) => (name === 'host' ? 'app.internal:8080' : undefined),
      protocol: 'http',
    })
    expect(resolveFlickrOAuthPublicOrigin(withHost)).toBe('http://app.internal:8080')
  })

  it('resolveFlickrOAuthPublicOrigin uses req.protocol when forwarded-proto is absent', () => {
    const req = makeReq({
      headers: {},
      get: (name: string) => (name === 'host' ? 't' : undefined),
      protocol: 'https',
    })
    expect(resolveFlickrOAuthPublicOrigin(req)).toBe('https://t')
  })

  it('resolveFlickrOAuthRedirectUrl returns absolute targets unchanged', () => {
    const req = makeReq({})
    expect(resolveFlickrOAuthRedirectUrl(req, 'https://elsewhere/')).toBe('https://elsewhere/')
  })

  it('resolveFlickrOAuthRedirectUrl resolves relative targets against public origin', () => {
    const req = makeReq({
      get: (name: string) => (name === 'host' ? 'only.host' : undefined),
      protocol: 'http',
    })
    expect(resolveFlickrOAuthRedirectUrl(req, '/a')).toBe('http://only.host/a')
    expect(resolveFlickrOAuthRedirectUrl(req, 'no-slash')).toBe('http://only.host/no-slash')
  })
})
