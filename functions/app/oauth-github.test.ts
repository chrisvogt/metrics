import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

import type { DocumentStore } from '../ports/document-store.js'

const fetchMock = vi.fn()

const masterKeyB64 = Buffer.alloc(32, 7).toString('base64')

/** Must match `PENDING_TTL_MS` in `oauth-github.ts`. */
const PENDING_TTL_MS = 15 * 60 * 1000

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

describe('registerGitHubOAuthRoutes', () => {
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

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
    const { registerGitHubOAuthRoutes } = await import('./oauth-github.js')
    const app = express()
    registerGitHubOAuthRoutes({
      expressApp: app,
      authenticateUser,
      documentStore,
      logger,
      isProductionEnvironment: opts?.isProductionEnvironment ?? false,
      allowedEmailDomains: opts?.allowedEmailDomains ?? ['@allowed.com'],
    })
    return app
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    process.env.INTEGRATION_TOKEN_MASTER_KEY = masterKeyB64
    process.env.GITHUB_APP_CLIENT_ID = 'gh-client-id'
    process.env.GITHUB_APP_CLIENT_SECRET = 'gh-secret'
    process.env.GITHUB_OAUTH_CALLBACK_URL = 'https://app.test/api/oauth/github/callback'
    delete process.env.PUBLIC_APP_ORIGIN
    authUser = { uid: 'user-1', email: 'owner@allowed.com' }
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    delete process.env.GITHUB_APP_CLIENT_ID
    delete process.env.GITHUB_APP_CLIENT_SECRET
    delete process.env.GITHUB_OAUTH_CALLBACK_URL
    delete process.env.GITHUB_OAUTH_SUCCESS_REDIRECT
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST start returns 403 in production when email domain is not allowed', async () => {
    const app = await buildApp({ isProductionEnvironment: true, allowedEmailDomains: ['@corp.test'] })
    authUser = { uid: 'user-1', email: 'me@gmail.com' }
    const res = await request(app)
      .post('/api/oauth/github/start')
      .send({})
      .expect(403)
    expect(res.body).toEqual({ ok: false, error: 'Forbidden' })
  })

  it('POST start returns 503 when GitHub OAuth env is incomplete', async () => {
    delete process.env.GITHUB_OAUTH_CALLBACK_URL
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/github/start').send({}).expect(503)
    expect(res.body.error).toContain('not configured')
  })

  it('POST start returns 400 when GitHub is already connected', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({ status: 'connected' })
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/github/start').send({}).expect(400)
    expect(res.body.error).toContain('already linked')
  })

  it('POST start returns authorize URL on success', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/github/start').send({}).expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.authorizeUrl).toContain('https://github.com/login/oauth/authorize')
    expect(res.body.authorizeUrl).toContain('client_id=gh-client-id')
    expect(res.body.authorizeUrl).toContain('state=')
  })

  it('GET callback redirects on provider error and preserves returnTo from pending', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      returnTo: '/overview',
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ error: 'access_denied', state: 's1' })
      .expect(302)
    expect(res.headers.location).toContain('access_denied')
    expect(res.headers.location).toContain('/overview')
  })

  it('GET callback completes OAuth and redirects', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({
        returnTo: '/onboarding',
      })
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date().toISOString(),
        returnTo: '/onboarding',
      })

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'ghu_test',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'ghr_test',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'octouser' }),
      })

    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'exchange-me', state: 'st1' })
      .expect(302)

    expect(res.headers.location).toContain('status=success')
    expect(documentStore.setDocument).toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith('GitHub OAuth completed', { uid: 'user-1', login: 'octouser' })
  })

  it('DELETE removes integration and pending bridge doc', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      oauthPendingGitHubState: 'pend-state',
    })
    const app = await buildApp()
    await request(app).delete('/api/oauth/github').expect(200)
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_github_pending/pend-state')
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('users/user-1/integrations/github')
  })

  it('POST start does not send when req.user is missing', async () => {
    const app = await buildApp()
    const handler = findRouteHandler(app, 'post', '/api/oauth/github/start')
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    await handler({ body: {} } as express.Request, { status, json } as unknown as express.Response, vi.fn())
    expect(json).not.toHaveBeenCalled()
  })

  it('POST start returns 503 when token encryption key is missing', async () => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/github/start').send({}).expect(503)
    expect(res.body.error).toContain('INTEGRATION_TOKEN_MASTER_KEY')
  })

  it('POST start clears prior pending state when stale bridge exists', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'pending_oauth',
      oauthPendingGitHubState: 'old-state',
    })
    const app = await buildApp()
    await request(app).post('/api/oauth/github/start').send({}).expect(200)
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_github_pending/old-state')
  })

  it('POST start ignores errors deleting prior pending state', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'pending_oauth',
      oauthPendingGitHubState: 'old-state',
    })
    vi.mocked(documentStore.deleteDocument).mockRejectedValueOnce(new Error('firestore flaky'))
    const app = await buildApp()
    await request(app).post('/api/oauth/github/start').send({}).expect(200)
  })

  it('POST start returns 500 when setDocument throws', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    vi.mocked(documentStore.setDocument).mockRejectedValueOnce(new Error('write failed'))
    const app = await buildApp()
    const res = await request(app).post('/api/oauth/github/start').send({}).expect(500)
    expect(res.body.ok).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('GET callback redirects missing_token when code or state absent', async () => {
    const app = await buildApp()
    const res = await request(app).get('/api/oauth/github/callback').query({ code: 'only-code' }).expect(302)
    expect(res.headers.location).toContain('missing_token')
  })

  it('GET callback redirects session_expired when pending missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'c', state: 'st' })
      .expect(302)
    expect(res.headers.location).toContain('session_expired')
  })

  it('GET callback redirects session_expired when pending is too old and deletes doc', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date(Date.now() - PENDING_TTL_MS - 60_000).toISOString(),
      })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'c', state: 'stale' })
      .expect(302)
    expect(res.headers.location).toContain('session_expired')
    expect(documentStore.deleteDocument).toHaveBeenCalledWith('oauth_github_pending/stale')
  })

  it('GET callback ignores delete failure when pending expired', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date(Date.now() - PENDING_TTL_MS - 60_000).toISOString(),
      })
    vi.mocked(documentStore.deleteDocument).mockRejectedValueOnce(new Error('no delete'))
    const app = await buildApp()
    await request(app).get('/api/oauth/github/callback').query({ code: 'c', state: 'stale' }).expect(302)
  })

  it('GET callback redirects server_misconfigured when env incomplete', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({ returnTo: '/x' })
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date().toISOString(),
      })
    delete process.env.GITHUB_APP_CLIENT_SECRET
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'c', state: 's1' })
      .expect(302)
    expect(res.headers.location).toContain('server_misconfigured')
  })

  it('GET callback redirects encryption_unconfigured when master key missing', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date().toISOString(),
      })
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'c', state: 's1' })
      .expect(302)
    expect(res.headers.location).toContain('encryption_unconfigured')
  })

  it('GET callback redirects token_exchange_failed when exchange throws', async () => {
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date().toISOString(),
      })
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'bad' }),
    })
    const app = await buildApp()
    const res = await request(app)
      .get('/api/oauth/github/callback')
      .query({ code: 'c', state: 's1' })
      .expect(302)
    expect(res.headers.location).toContain('token_exchange_failed')
    expect(logger.error).toHaveBeenCalledWith('GitHub OAuth callback failed', expect.any(Object))
  })

  it('GET callback uses app success redirect when pending has no returnTo', async () => {
    process.env.GITHUB_OAUTH_SUCCESS_REDIRECT = '/settings/integrations'
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        uid: 'user-1',
        createdAt: new Date().toISOString(),
      })
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'ghu_test',
          token_type: 'bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: 'u' }),
      })
    const app = await buildApp()
    const res = await request(app).get('/api/oauth/github/callback').query({ code: 'c', state: 's2' }).expect(302)
    // `appSuccessRedirect` is used as-is (no `withGitHubOAuthFlash` query params).
    expect(res.headers.location).toContain('/settings/integrations')
    delete process.env.GITHUB_OAUTH_SUCCESS_REDIRECT
  })

  it('DELETE returns 500 when store does not support deleteDocument', async () => {
    delete (documentStore as { deleteDocument?: unknown }).deleteDocument
    const app = await buildApp()
    const res = await request(app).delete('/api/oauth/github').expect(500)
    expect(res.body.error).toContain('not supported')
  })

  it('DELETE returns 500 when integration delete throws', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    vi.mocked(documentStore.deleteDocument).mockRejectedValueOnce(new Error('boom'))
    const app = await buildApp()
    const res = await request(app).delete('/api/oauth/github').expect(500)
    expect(res.body.ok).toBe(false)
    expect(logger.error).toHaveBeenCalledWith('GitHub disconnect failed', expect.any(Object))
  })

  it('DELETE ignores errors deleting pending bridge doc', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      oauthPendingGitHubState: 'pend-state',
    })
    vi.mocked(documentStore.deleteDocument)
      .mockRejectedValueOnce(new Error('pending gone'))
      .mockResolvedValueOnce(undefined)
    const app = await buildApp()
    await request(app).delete('/api/oauth/github').expect(200)
  })

  it('DELETE does not send when req.user is missing', async () => {
    const app = await buildApp()
    const handler = findRouteHandler(app, 'delete', '/api/oauth/github')
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    await handler(
      {} as express.Request,
      { status, json } as unknown as express.Response,
      vi.fn(),
    )
    expect(json).not.toHaveBeenCalled()
  })
})

describe('resolveGitHubOAuthRedirectUrl', () => {
  afterEach(() => {
    delete process.env.PUBLIC_APP_ORIGIN
  })

  it('returns absolute URLs unchanged', async () => {
    const { resolveGitHubOAuthRedirectUrl } = await import('./oauth-github.js')
    const req = {
      headers: {},
      get: vi.fn(),
      protocol: 'http',
    } as unknown as express.Request
    expect(resolveGitHubOAuthRedirectUrl(req, 'https://elsewhere.test/path')).toBe('https://elsewhere.test/path')
    expect(resolveGitHubOAuthRedirectUrl(req, 'http://localhost/x')).toBe('http://localhost/x')
  })

  it('prefixes relative paths with PUBLIC_APP_ORIGIN or forwarded host', async () => {
    const { resolveGitHubOAuthRedirectUrl } = await import('./oauth-github.js')
    process.env.PUBLIC_APP_ORIGIN = 'https://app.example/'
    const req = {
      headers: {},
      get: vi.fn(),
      protocol: 'https',
    } as unknown as express.Request
    expect(resolveGitHubOAuthRedirectUrl(req, 'onboarding')).toBe('https://app.example/onboarding')
  })

  it('uses x-forwarded-* when PUBLIC_APP_ORIGIN unset', async () => {
    const { resolveGitHubOAuthRedirectUrl, resolveGitHubOAuthPublicOrigin } = await import('./oauth-github.js')
    const req = {
      headers: {
        'x-forwarded-host': 'edge.test',
        'x-forwarded-proto': 'https',
      },
      get: vi.fn((name: string) => (name === 'host' ? 'internal:8080' : undefined)),
      protocol: 'http',
    } as unknown as express.Request
    expect(resolveGitHubOAuthPublicOrigin(req)).toBe('https://edge.test')
    expect(resolveGitHubOAuthRedirectUrl(req, '/foo')).toBe('https://edge.test/foo')
  })
})

