import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'

vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn(() => (_req, _res, next) => next?.()),
}))

vi.mock('../jobs/delete-user.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../widgets/get-widget-content.js', () => ({
  getWidgetContent: vi.fn(() => Promise.resolve({ ok: true })),
  validWidgetIds: ['spotify'],
}))

vi.mock('../services/sync-manual.js', () => ({
  runSyncForProvider: vi.fn(() => Promise.resolve({
    afterJob: { jobId: 'sync-chrisvogt-steam', status: 'completed' },
    beforeJob: { jobId: 'sync-chrisvogt-steam', status: 'queued' },
    enqueue: { jobId: 'sync-chrisvogt-steam', status: 'enqueued' },
    worker: { jobId: 'sync-chrisvogt-steam', result: 'SUCCESS' },
  })),
}))

const findRouteHandler = (
  app: ReturnType<typeof import('express').default>,
  method: 'get' | 'delete' | 'post',
  routePath: string
) => {
  const layer = app.router.stack.find(
    (entry: { route?: { path?: string; methods?: Record<string, boolean>; stack?: Array<{ handle: Function }> } }) =>
      entry.route?.path === routePath && entry.route?.methods?.[method]
  )

  if (!layer?.route?.stack?.length) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${routePath}`)
  }

  return layer.route.stack[layer.route.stack.length - 1].handle
}

const findProtectedRouteMiddleware = (
  app: ReturnType<typeof import('express').default>,
  method: 'get' | 'delete',
  routePath: string
) => {
  const layer = app.router.stack.find(
    (entry: { route?: { path?: string; methods?: Record<string, boolean>; stack?: Array<{ handle: Function }> } }) =>
      entry.route?.path === routePath && entry.route?.methods?.[method]
  )

  if (!layer?.route?.stack || layer.route.stack.length < 2) {
    throw new Error(`Protected route middleware not found: ${method.toUpperCase()} ${routePath}`)
  }

  return layer.route.stack[layer.route.stack.length - 2].handle
}

const createResponse = () => {
  const response = {
    json: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  }

  response.status.mockReturnValue(response)

  return response
}

describe('createExpressApp route coverage', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
    ensureRuntimeConfigApplied.mockResolvedValue(undefined)
  })

  it('serves both client auth config routes through the shared config sender', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () => new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
      syncJobQueue,
    })

    const clientAuthHandler = findRouteHandler(app, 'get', '/api/client-auth-config')
    const firebaseAliasHandler = findRouteHandler(app, 'get', '/api/firebase-config')

    const clientAuthResponse = createResponse()
    const firebaseAliasResponse = createResponse()

    await clientAuthHandler({}, clientAuthResponse)
    await firebaseAliasHandler({}, firebaseAliasResponse)

    expect(ensureRuntimeConfigApplied).toHaveBeenCalledTimes(2)
    expect(getClientAuthConfig).toHaveBeenCalledTimes(2)
    expect(clientAuthResponse.json).toHaveBeenCalledWith({
      apiKey: 'public-key',
      authDomain: 'metrics.firebaseapp.com',
      projectId: 'metrics-project',
    })
    expect(firebaseAliasResponse.json).toHaveBeenCalledWith({
      apiKey: 'public-key',
      authDomain: 'metrics.firebaseapp.com',
      projectId: 'metrics-project',
    })
  })

  it('reports session auth header errors for missing, blank, and valid bearer tokens', async () => {
    const { getSessionAuthError } = await import('./create-express-app.js')

    expect(getSessionAuthError(undefined)).toBe('No valid authorization token provided')
    expect(getSessionAuthError('Basic token')).toBe('No valid authorization token provided')
    expect(getSessionAuthError('Bearer   ')).toBe('No token')
    expect(getSessionAuthError('Bearer valid-token')).toBeNull()
  })

  it.each([
    'discogs',
    'goodreads',
    'instagram',
    'steam',
  ])('dispatches the %s sync route through the queue-backed runner', async (provider) => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () => new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
      syncJobQueue,
    })
    const syncRouteHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider')
    const response = createResponse()
    const { runSyncForProvider } = await import('../services/sync-manual.js')

    await syncRouteHandler({ params: { provider } }, response)

    expect(runSyncForProvider).toHaveBeenCalledWith({
      documentStore,
      provider,
      syncJobQueue,
    })
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.send).toHaveBeenCalledWith(expect.objectContaining({
      enqueue: { jobId: 'sync-chrisvogt-steam', status: 'enqueued' },
    }))
  })


  it('returns 401 when session auth reaches the defensive no-token branch', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () => new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
      syncJobQueue,
    })

    const sessionHandler = findRouteHandler(app, 'post', '/api/auth/session')
    const response = createResponse()
    const authorization = {
      startsWith: vi.fn(() => true),
      split: vi.fn(() => ['Bearer token', 'synthetic-token']),
      slice: vi.fn(() => '   '),
    }

    await sessionHandler(
      {
        headers: { authorization },
      },
      response
    )

    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({ ok: false, error: 'No token' })
  })

  it('returns 401 when the protected auth middleware receives a blank bearer token', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () => new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
      syncJobQueue,
    })

    const authenticateUser = findProtectedRouteMiddleware(app, 'get', '/api/user/profile')
    const response = createResponse()
    const next = vi.fn()

    await authenticateUser(
      {
        cookies: {},
        headers: { authorization: 'Bearer   ' },
      },
      response,
      next
    )

    expect(logger.warn).toHaveBeenCalledWith('No valid authorization header found', {
      authHeaderStart: 'Bearer   ',
      hasAuthHeader: true,
    })
    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({
      ok: false,
      error: 'No valid authorization header found',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('handles CSRF-shaped errors in the error middleware before delegating others', async () => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      resolveMediaStore: () => new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
      syncJobQueue,
    })

    type ErrorLayer = { handle?: (a: unknown, b: unknown, c: unknown, d: unknown) => void }
    const stack = (app as { router?: { stack: ErrorLayer[] } }).router?.stack ?? []
    const errorHandlers = stack.filter((l) => l.handle && l.handle.length === 4)
    const csrfAware = errorHandlers[errorHandlers.length - 1]?.handle
    if (!csrfAware) throw new Error('Expected Express error middleware')

    const res403 = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }
    const nextCsrf = vi.fn()
    csrfAware(new Error('CSRF token mismatch'), {}, res403, nextCsrf)
    expect(res403.status).toHaveBeenCalledWith(403)
    expect(res403.json).toHaveBeenCalledWith({
      ok: false,
      error: 'CSRF token mismatch',
    })
    expect(nextCsrf).not.toHaveBeenCalled()

    const resPass = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    }
    const nextPass = vi.fn()
    const passthroughErr = new Error('database unavailable')
    csrfAware(passthroughErr, {}, resPass, nextPass)
    expect(nextPass).toHaveBeenCalledWith(passthroughErr)
  })
})
