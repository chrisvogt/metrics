import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'
import { createCookieBackedCsrfImpl } from './cookie-backed-csrf.js'

vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn(() => (_req, _res, next) => next()),
}))

vi.mock('../jobs/delete-user.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../widgets/get-widget-content.js', () => ({
  getWidgetContent: vi.fn(() => Promise.resolve({ mock: 'widget-content' })),
  validWidgetIds: ['spotify'],
}))

vi.mock('../services/shadow-sync-manual.js', () => ({
  runSyncForProvider: vi.fn(() => Promise.resolve({
    afterJob: { jobId: 'sync-chrisvogt-steam-live', status: 'completed' },
    beforeJob: { jobId: 'sync-chrisvogt-steam-live', status: 'queued' },
    enqueue: { jobId: 'sync-chrisvogt-steam-live', status: 'enqueued' },
    worker: { jobId: 'sync-chrisvogt-steam-live', result: 'SUCCESS' },
  })),
}))

describe('createExpressApp media route', () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  const authService = {
    createSessionCookie: vi.fn(),
    deleteUser: vi.fn(),
    getUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
  }

  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  }

  const syncJobQueue = {
    claimJob: vi.fn(),
    claimNextJob: vi.fn(),
    completeJob: vi.fn(),
    enqueue: vi.fn(),
    failJob: vi.fn(),
    getJob: vi.fn(),
  }

  const buildApp = async () => {
    const { createExpressApp } = await import('./create-express-app.js')

    return createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () =>
        new LocalDiskMediaStore(path.join(os.tmpdir(), 'metrics-unused-media-root')),
      syncJobQueue,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 404 when disk media serving is disabled', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => ({
        describe: () => ({ backend: 'gcs', target: 'bucket' }),
        fetchAndStore: vi.fn(),
        listFiles: vi.fn(),
      }),
      syncJobQueue,
    })

    await request(app)
      .get('/api/media/cover.jpg')
      .expect(404)
  })

  it('returns 404 when no media path is provided', async () => {
    const app = await buildApp()

    await request(app)
      .get('/api/media/')
      .expect(404)
  })

  it('returns 404 when the selected media store is not local disk-backed', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => ({
        describe: () => ({ backend: 'gcs', target: '/tmp/not-local' }),
        fetchAndStore: vi.fn(),
        listFiles: vi.fn(),
      }),
      syncJobQueue,
    })

    await request(app)
      .get('/api/media/cover.jpg')
      .expect(404)
  })

  it('returns 404 when the resolved media path escapes the local media root', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-root-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)

    vi.spyOn(mediaStore, 'resolveAbsolutePath').mockReturnValue(
      path.join(rootDir, '..', 'outside.txt')
    )
    const { createExpressApp } = await import('./create-express-app.js')
    const routeApp = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => mediaStore,
      syncJobQueue,
    })

    await request(routeApp)
      .get('/api/media/cover.jpg')
      .expect(404)
  })

  it('serves files from the local media root and returns 404 when the file is missing', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-files-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => mediaStore,
      syncJobQueue,
    })

    const existingPath = path.join(rootDir, 'cover.jpg')
    fs.writeFileSync(existingPath, 'file-bytes')

    await request(app)
      .get('/api/media/cover.jpg')
      .expect(200)

    await request(app)
      .get('/api/media/missing.jpg')
      .expect(404)
  })

  it('returns 500 when sendFile fails with a non-ENOENT error', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-dir-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => mediaStore,
      syncJobQueue,
    })

    fs.mkdirSync(path.join(rootDir, 'folder'))

    await request(app)
      .get('/api/media/folder')
      .expect(500)
  })

  it('does not overwrite the response when sendFile fails after headers are already sent', async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-sent-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getClientAuthConfig: vi.fn(() => ({})),
      logger,
      resolveMediaStore: () => mediaStore,
    })

    fs.writeFileSync(path.join(rootDir, 'cover.jpg'), 'file-bytes')

    const sendFileSpy = vi
      .spyOn(app.response, 'sendFile')
      .mockImplementation(function mockedSendFile(this: any, _filePath: string, callback?: any) {
        this.status(200).send('already-sent')
        callback?.(Object.assign(new Error('late sendFile failure'), { code: 'ENOENT' }))
        return this
      })

    const response = await request(app)
      .get('/api/media/cover.jpg')
      .expect(200)

    expect(response.text).toBe('already-sent')
    sendFileSpy.mockRestore()
  })
})

describe('createExpressApp auth and session branches', () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  const authService = {
    createSessionCookie: vi.fn(),
    deleteUser: vi.fn(),
    getUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
  }

  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  }

  const syncJobQueue = {
    claimJob: vi.fn(),
    claimNextJob: vi.fn(),
    completeJob: vi.fn(),
    enqueue: vi.fn(),
    failJob: vi.fn(),
    getJob: vi.fn(),
  }

  const ensureRuntimeConfigApplied = vi.fn().mockResolvedValue(undefined)
  const getClientAuthConfig = vi.fn(() => ({
    apiKey: 'public-key',
    authDomain: 'metrics.firebaseapp.com',
    projectId: 'metrics-project',
  }))

  const buildApp = async () => {
    const { createExpressApp } = await import('./create-express-app.js')

    return createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () =>
        new LocalDiskMediaStore(path.join(os.tmpdir(), 'metrics-unused-auth-media')),
      syncJobQueue,
    })
  }

  async function getCsrfHeaders(app: Awaited<ReturnType<typeof buildApp>>) {
    const agent = request.agent(app)
    const capturedCookies: string[] = []
    const cookieBackedCsrf = createCookieBackedCsrfImpl({
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    const csrfState = cookieBackedCsrf.create(
      {
        cookies: {},
        res: {
          cookie: (name: string, value: string) => {
            capturedCookies.push(`${name}=${value}`)
          },
        },
      } as never,
      '_csrfSecret'
    )

    return {
      agent,
      csrfToken: csrfState.token,
      cookies: capturedCookies,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
    ensureRuntimeConfigApplied.mockResolvedValue(undefined)
    getClientAuthConfig.mockReturnValue({
      apiKey: 'public-key',
      authDomain: 'metrics.firebaseapp.com',
      projectId: 'metrics-project',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = 'test'
  })

  it('creates a strict secure session cookie in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = await buildApp()

    authService.verifyIdToken.mockResolvedValue({
      uid: 'prod-user',
      email: 'prod@chrisvogt.me',
      emailVerified: true,
    })
    authService.createSessionCookie.mockResolvedValue('prod-session-cookie')

    const { agent, csrfToken, cookies } = await getCsrfHeaders(app)
    const response = await agent
      .post('/api/auth/session')
      .set('Cookie', cookies)
      .set('X-XSRF-TOKEN', csrfToken)
      .set('Authorization', 'Bearer prod-token')
      .expect(200)

    const sessionCookie = (response.headers['set-cookie'] as string[]).find((cookie) =>
      cookie.startsWith('session=')
    )

    expect(sessionCookie).toContain('SameSite=Strict')
    expect(sessionCookie).toContain('HttpOnly')
  })

  it('clears the session cookie with strict settings in production logout', async () => {
    process.env.NODE_ENV = 'production'
    const app = await buildApp()

    authService.verifyIdToken.mockResolvedValue({
      uid: 'prod-user',
      email: 'prod@chrisvogt.me',
      emailVerified: true,
    })
    authService.revokeRefreshTokens.mockResolvedValue(undefined)

    const { agent, csrfToken, cookies } = await getCsrfHeaders(app)
    const response = await agent
      .post('/api/auth/logout')
      .set('Cookie', cookies)
      .set('X-XSRF-TOKEN', csrfToken)
      .set('Authorization', 'Bearer prod-token')
      .expect(200)

    const clearedSessionCookie = (response.headers['set-cookie'] as string[]).find((cookie) =>
      cookie.startsWith('session=')
    )

    expect(clearedSessionCookie).toContain('SameSite=Strict')
    expect(clearedSessionCookie).toContain('session=')
  })

  it('falls back cleanly when session-cookie verification rejects with a plain object', async () => {
    const app = await buildApp()

    authService.verifySessionCookie.mockRejectedValue({
      code: 'auth/invalid-session-cookie',
    })

    const response = await request(app)
      .get('/api/user/profile')
      .set('Cookie', 'session=invalid-cookie')
      .expect(401)

    expect(response.body.ok).toBe(false)
  })

  it('returns 401 when bearer token verification rejects with a plain object', async () => {
    const app = await buildApp()

    authService.verifyIdToken.mockRejectedValue({
      code: 'auth/argument-error',
    })

    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer bad-token')
      .expect(401)

    expect(response.body.error).toBe('Invalid or expired JWT token')
  })

  it('returns 401 when the auth middleware outer catch receives a non-Error failure', async () => {
    const app = await buildApp()

    logger.info.mockImplementationOnce(() => undefined)
    logger.info.mockImplementationOnce(() => {
      throw { code: 'logger-failure' }
    })

    const response = await request(app)
      .get('/api/user/profile')
      .set('Authorization', 'Bearer token')
      .expect(401)

    expect(response.body.error).toBe('Invalid or expired token')
  })

  it('rejects state-changing requests when the CSRF token is missing', async () => {
    const app = await buildApp()

    const response = await request(app)
      .post('/api/auth/session')
      .set('Authorization', 'Bearer token')
      .expect(403)

    expect(response.body).toEqual({
      ok: false,
      error: 'CSRF token missing',
    })
  })

  it('returns the client auth config from the provider-neutral endpoint', async () => {
    const app = await buildApp()

    const response = await request(app)
      .get('/api/client-auth-config')
      .expect(200)

    expect(response.body).toEqual({
      apiKey: 'public-key',
      authDomain: 'metrics.firebaseapp.com',
      projectId: 'metrics-project',
    })
    expect(ensureRuntimeConfigApplied).toHaveBeenCalledTimes(1)
    expect(getClientAuthConfig).toHaveBeenCalledTimes(1)
  })

  it('keeps the firebase config endpoint as a compatibility alias', async () => {
    const app = await buildApp()

    const response = await request(app)
      .get('/api/firebase-config')
      .expect(200)

    expect(response.body).toEqual({
      apiKey: 'public-key',
      authDomain: 'metrics.firebaseapp.com',
      projectId: 'metrics-project',
    })
    expect(ensureRuntimeConfigApplied).toHaveBeenCalledTimes(1)
    expect(getClientAuthConfig).toHaveBeenCalledTimes(1)
  })

  it.each([
    'discogs',
    'goodreads',
    'instagram',
    'steam',
  ])('runs %s through the queue-backed sync route wrapper', async (provider) => {
    const app = await buildApp()
    const { runSyncForProvider } = await import('../services/shadow-sync-manual.js')

    const response = await request(app)
      .get(`/api/widgets/sync/${provider}`)
      .expect(200)

    expect(runSyncForProvider).toHaveBeenCalledWith({
      documentStore,
      provider,
      syncJobQueue,
    })
    expect(response.body.enqueue.status).toBe('enqueued')
    expect(response.body.worker.result).toBe('SUCCESS')
  })

  it('returns 400 for unsupported sync providers', async () => {
    const app = await buildApp()

    const response = await request(app)
      .get('/api/widgets/sync/github')
      .expect(400)

    expect(response.text).toBe('Unrecognized or unsupported provider.')
  })


  it('treats array sync provider params as unsupported', async () => {
    const app = await buildApp()
    const syncRouteLayer = app.router.stack.find(
      (layer) => layer.route?.path === '/api/widgets/sync/:provider'
    )
    const syncHandler = syncRouteLayer?.route?.stack.at(-1)?.handle

    expect(syncHandler).toBeTypeOf('function')

    const req = {
      params: {
        provider: ['discogs'],
      },
    }
    const res = {
      send: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }

    await syncHandler?.(req, res)

    expect(logger.info).toHaveBeenCalledWith(
      'Attempted to sync an unrecognized provider: undefined'
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith('Unrecognized or unsupported provider.')
  })
})
