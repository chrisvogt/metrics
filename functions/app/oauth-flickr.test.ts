import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import type { DocumentStore } from '../ports/document-store.js'
import {
  buildFlickrAuthorizeUrl,
  flickrGetAccessToken,
  flickrGetRequestToken,
} from '../services/flickr-oauth1a.js'

vi.mock('../services/flickr-oauth1a.js', () => ({
  buildFlickrAuthorizeUrl: vi.fn(() => 'https://flickr.test/oauth/authorize'),
  flickrGetAccessToken: vi.fn(),
  flickrGetRequestToken: vi.fn(),
}))

const masterKeyB64 = Buffer.alloc(32, 7).toString('base64')

const findRouteHandler = (
  app: express.Express,
  method: 'get' | 'post' | 'delete',
  routePath: string
) => {
  const layer = app.router.stack.find(
    (entry: {
      route?: { path?: string; methods?: Record<string, boolean>; stack?: Array<{ handle: (...args: unknown[]) => unknown }> }
    }) => entry.route?.path === routePath && entry.route?.methods?.[method]
  )
  if (!layer?.route?.stack?.length) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`)
  }
  return layer.route.stack[layer.route.stack.length - 1].handle
}

describe('registerFlickrOAuthRoutes', () => {
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
  const createRateLimiter = () => (_req: unknown, _res: unknown, next: () => void) => next()

  let documentStore: DocumentStore & { deleteDocument?: (path: string) => Promise<void> }
  let authUser: { uid: string; email?: string } | null
  const authenticateUser: express.RequestHandler = (req, _res, next) => {
    if (authUser) {
      ;(req as express.Request & { user?: { uid: string; email?: string } }).user = authUser
    }
    next()
  }

  const buildApp = async (opts?: {
    isProductionEnvironment?: boolean
    allowedEmailDomains?: string[]
  }) => {
    vi.resetModules()
    const { registerFlickrOAuthRoutes } = await import('./oauth-flickr.js')
    const app = express()
    registerFlickrOAuthRoutes({
      expressApp: app,
      authenticateUser,
      documentStore,
      logger,
      isProductionEnvironment: opts?.isProductionEnvironment ?? false,
      allowedEmailDomains: opts?.allowedEmailDomains ?? ['@allowed.com'],
      createRateLimiter,
    })
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INTEGRATION_TOKEN_MASTER_KEY = masterKeyB64
    process.env.FLICKR_API_KEY = 'consumer-key'
    process.env.FLICKR_API_SECRET = 'consumer-secret'
    process.env.FLICKR_OAUTH_CALLBACK_URL = 'https://app.test/api/oauth/flickr/callback'
    delete process.env.PUBLIC_APP_ORIGIN
    authUser = { uid: 'user-1', email: 'owner@allowed.com' }
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(flickrGetRequestToken).mockResolvedValue({
      oauthToken: 'req-token',
      oauthTokenSecret: 'req-secret',
    })
    vi.mocked(flickrGetAccessToken).mockResolvedValue({
      oauthToken: 'acc-token',
      oauthTokenSecret: 'acc-secret',
      userNsid: 'nsid-1',
      username: 'flickr-user',
      fullname: 'Flickr User',
    })
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    delete process.env.FLICKR_API_KEY
    delete process.env.FLICKR_API_SECRET
    delete process.env.FLICKR_OAUTH_CALLBACK_URL
    delete process.env.FLICKR_OAUTH_SUCCESS_REDIRECT
    vi.restoreAllMocks()
  })

  it('POST start returns 403 in production when email domain is not allowed', async () => {
    const app = await buildApp({ isProductionEnvironment: true, allowedEmailDomains: ['@corp.test'] })
    authUser = { uid: 'user-1', email: 'me@gmail.com' }
    const res = await request(app)
      .post('/api/oauth/flickr/start')
      .send({})
      .expect(403)
    expect(res.body).toEqual({ ok: false, error: 'Forbidden' })
  })

  it('POST start returns 503 when Flickr OAuth env is incomplete', async () => {
    delete process.env.FLICKR_OAUTH_CALLBACK_URL
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/flickr/start').send({}).expect(503)
    expect(res.body.error).toContain('not configured')
  })

  it('POST start returns 503 when integration token master key is missing', async () => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/flickr/start').send({}).expect(503)
    expect(res.body.error).toContain('encryption')
  })

  it('POST start returns 400 when Flickr is already connected', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({ status: 'connected' })
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/flickr/start').send({}).expect(400)
    expect(res.body.error).toContain('already linked')
  })

  it('POST start clears stale pending doc when one exists', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'pending_oauth',
      oauthPendingRequestToken: 'old-req',
    })
    const app = await buildApp()
    await request(app).post('/api/oauth/flickr/start').send({ returnTo: '/onboarding' }).expect(200)
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_flickr_pending/old-req')
    expect(documentStore.setDocument).toHaveBeenCalled()
    expect(buildFlickrAuthorizeUrl).toHaveBeenCalledWith('req-token', 'read')
  })

  it('POST start returns authorize URL on success', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/flickr/start').send({}).expect(200)
    expect(res.body).toEqual({ ok: true, authorizeUrl: 'https://flickr.test/oauth/authorize' })
  })

  it('POST start returns 500 when Flickr request token exchange fails', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    vi.mocked(flickrGetRequestToken).mockRejectedValue(new Error('network'))
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/flickr/start').send({}).expect(500)
    expect(res.body.ok).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('POST start does not send when req.user is missing', async () => {
    const app = await buildApp()
    const handler = findRouteHandler(app, 'post', '/api/oauth/flickr/start')
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    await handler({ body: {} } as express.Request, { status, json } as unknown as express.Response, vi.fn())
    expect(json).not.toHaveBeenCalled()
  })

  it('GET callback redirects when token or verifier is missing', async () => {
    const app = await buildApp()
    const res = await request(app).get('/api/oauth/flickr/callback').expect(302)
    expect(res.headers.location).toContain('reason=missing_token')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('GET callback redirects when pending session is unknown', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('reason=session_expired')
  })

  it('GET callback expires stale pending rows and redirects', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('session_expired')
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_flickr_pending/tok')
  })

  it('GET callback skips pending TTL enforcement when store cannot delete', async () => {
    delete documentStore.deleteDocument
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('session_expired')
  })

  it('GET callback redirects when consumer credentials vanish mid-flight', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    delete process.env.FLICKR_API_SECRET
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('server_misconfigured')
  })

  it('GET callback redirects when encryption is not configured', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('encryption_unconfigured')
  })

  it('GET callback completes OAuth and redirects using returnTo flash', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
      returnTo: '/overview',
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .set('Host', 'api.local.test')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('http://api.local.test/overview')
    expect(res.headers.location).toContain('status=success')
    expect(documentStore.setDocument).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('Flickr OAuth completed', { uid: 'user-1', nsid: 'nsid-1' })
  })

  it('GET callback uses configured success redirect when returnTo is absent', async () => {
    process.env.FLICKR_OAUTH_SUCCESS_REDIRECT = '/welcome'
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('/welcome')
  })

  it('GET callback ignores unsafe pending returnTo and uses app success redirect', async () => {
    process.env.FLICKR_OAUTH_SUCCESS_REDIRECT = '/safe'
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
      returnTo: 'https://evil.example/phish',
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('/safe')
  })

  it('GET callback succeeds when store has no deleteDocument helper', async () => {
    delete documentStore.deleteDocument
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    const app = await buildApp()
    await request(app).get('/api/oauth/flickr/callback').query({ oauth_token: 'tok', oauth_verifier: 'ver' }).expect(302)
    expect(documentStore.setDocument).toHaveBeenCalled()
  })

  it('GET callback uses PUBLIC_APP_ORIGIN for redirects', async () => {
    process.env.PUBLIC_APP_ORIGIN = 'https://public.example/'
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location.startsWith('https://public.example/')).toBe(true)
  })

  it('GET callback allows absolute redirect targets from success redirect setting', async () => {
    process.env.FLICKR_OAUTH_SUCCESS_REDIRECT = 'https://elsewhere.example/done'
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toBe('https://elsewhere.example/done')
  })

  it('GET callback redirects on access token failure', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      uid: 'user-1',
      oauthTokenSecret: 'sec',
      createdAt: new Date().toISOString(),
      returnTo: '/integrations',
    })
    vi.mocked(flickrGetAccessToken).mockRejectedValue(new Error('denied'))
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/flickr/callback')
      .query({ oauth_token: 'tok', oauth_verifier: 'ver' })
      .expect(302)
    expect(res.headers.location).toContain('token_exchange_failed')
    expect(res.headers.location).toContain('/integrations')
    expect(logger.error).toHaveBeenCalled()
  })

  it('POST start ignores failures when clearing a stale pending bridge doc', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'pending_oauth',
      oauthPendingRequestToken: 'old-req',
    })
    vi.mocked(documentStore.deleteDocument).mockRejectedValue(new Error('stale missing'))
    const app = await buildApp()
    await request(app).post('/api/oauth/flickr/start').send({}).expect(200)
    expect(flickrGetRequestToken).toHaveBeenCalled()
  })

  it('DELETE returns 500 when deleteDocument is unsupported', async () => {
    delete documentStore.deleteDocument
    const app = await buildApp()
    const res = await request(app).delete('/api/oauth/flickr').expect(500)
    expect(res.body.error).toContain('not supported')
  })

  it('DELETE removes integration and pending bridge doc', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      oauthPendingRequestToken: 'pend-tok',
    })
    const app = await buildApp()
    await request(app).delete('/api/oauth/flickr').expect(200)
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_flickr_pending/pend-tok')
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('users/user-1/integrations/flickr')
  })

  it('DELETE ignores errors when pending cleanup fails', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      oauthPendingRequestToken: 'pend-tok',
    })
    vi.mocked(documentStore.deleteDocument).mockRejectedValueOnce(new Error('missing')).mockResolvedValue(undefined)
    const app = await buildApp()
    await request(app).delete('/api/oauth/flickr').expect(200)
  })

  it('DELETE returns 500 when integration delete throws', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({})
    vi.mocked(documentStore.deleteDocument).mockRejectedValue(new Error('fail'))
    const app = await buildApp()
    const res = await request(app).delete('/api/oauth/flickr').expect(500)
    expect(res.body.ok).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('DELETE does not send when req.user is missing', async () => {
    const app = await buildApp()
    const handler = findRouteHandler(app, 'delete', '/api/oauth/flickr')
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    await handler({} as express.Request, { status, json } as unknown as express.Response, vi.fn())
    expect(json).not.toHaveBeenCalled()
  })
})
