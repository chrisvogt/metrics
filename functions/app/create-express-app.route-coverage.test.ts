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
        path: '/api/user/profile',
        cookies: {},
        headers: { authorization: 'Bearer   ' },
      },
      response,
      next
    )

    expect(logger.warn).toHaveBeenCalledWith('No valid authorization header found', {
      path: '/api/user/profile',
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

  it('streams manual sync progress as SSE and forwards onProgress', async () => {
    const { runSyncForProvider } = await import('../services/sync-manual.js')
    vi.mocked(runSyncForProvider).mockImplementationOnce(
      async ({ onProgress }: { onProgress?: (e: { phase: string; message: string }) => void }) => {
        onProgress?.({ phase: 'unit.test', message: 'Progress step' })
        return {
          afterJob: { jobId: 'j1', status: 'completed' },
          beforeJob: { jobId: 'j1', status: 'queued' },
          enqueue: { jobId: 'j1', status: 'enqueued' },
          worker: { jobId: 'j1', result: 'SUCCESS' },
        }
      }
    )

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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    }

    await streamHandler({ params: { provider: 'spotify' } }, response)

    expect(runSyncForProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        documentStore,
        provider: 'spotify',
        syncJobQueue,
        onProgress: expect.any(Function),
      }),
    )
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream; charset=utf-8',
    )
    expect(response.write).toHaveBeenCalled()
    const written = vi.mocked(response.write).mock.calls.map((c) => c[0] as string).join('')
    expect(written).toContain('Progress step')
    expect(written).toContain('"type":"done"')
    expect(response.end).toHaveBeenCalled()
  })

  it('returns 400 for manual sync stream when provider param is not a string', async () => {
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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    await streamHandler({ params: { provider: ['spotify'] as unknown as string } }, response)

    expect(logger.info).toHaveBeenCalledWith(
      'Attempted to sync stream for an unrecognized provider: undefined',
    )
    expect(response.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 for manual sync stream when provider param is missing', async () => {
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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    await streamHandler({ params: {} }, response)

    expect(logger.info).toHaveBeenCalledWith(
      'Attempted to sync stream for an unrecognized provider: undefined',
    )
    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.send).toHaveBeenCalledWith('Unrecognized or unsupported provider.')
  })

  it('returns 400 for manual sync stream with an unsupported provider', async () => {
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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    }

    await streamHandler({ params: { provider: 'github' } }, response)

    expect(logger.info).toHaveBeenCalledWith(
      'Attempted to sync stream for an unrecognized provider: github',
    )
    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.send).toHaveBeenCalledWith('Unrecognized or unsupported provider.')
  })

  it('emits SSE error when manual sync stream runner throws an Error', async () => {
    const { runSyncForProvider } = await import('../services/sync-manual.js')
    vi.mocked(runSyncForProvider).mockRejectedValueOnce(new Error('sync boom'))

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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    }

    await streamHandler({ params: { provider: 'spotify' } }, response)

    expect(logger.error).toHaveBeenCalledWith('Error syncing spotify data (SSE).', expect.any(Error))
    const written = vi.mocked(response.write).mock.calls.map((c) => c[0] as string).join('')
    expect(written).toContain('"type":"error"')
    expect(written).toContain('sync boom')
    expect(response.end).toHaveBeenCalled()
  })

  it('emits SSE error when manual sync stream runner throws a non-Error value', async () => {
    const { runSyncForProvider } = await import('../services/sync-manual.js')
    vi.mocked(runSyncForProvider).mockRejectedValueOnce('plain failure')

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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      setHeader: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    }

    await streamHandler({ params: { provider: 'spotify' } }, response)

    const written = vi.mocked(response.write).mock.calls.map((c) => c[0] as string).join('')
    expect(written).toContain('"type":"error"')
    expect(written).toContain('plain failure')
    expect(response.end).toHaveBeenCalled()
  })

  it('swallows write errors on SSE progress events when the client disconnects', async () => {
    const { runSyncForProvider } = await import('../services/sync-manual.js')
    let writeCount = 0
    vi.mocked(runSyncForProvider).mockImplementationOnce(
      async ({ onProgress }: { onProgress?: (e: { phase: string; message: string }) => void }) => {
        onProgress?.({ phase: 'unit.test', message: 'first' })
        onProgress?.({ phase: 'unit.test', message: 'second' })
        return {
          afterJob: { jobId: 'j1', status: 'completed' },
          beforeJob: { jobId: 'j1', status: 'queued' },
          enqueue: { jobId: 'j1', status: 'enqueued' },
          worker: { jobId: 'j1', result: 'SUCCESS' },
        }
      },
    )

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

    const streamHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider/stream')
    const response = {
      setHeader: vi.fn(),
      write: vi.fn(() => {
        writeCount += 1
        if (writeCount === 1) {
          throw new Error('ECONNRESET')
        }
      }),
      end: vi.fn(),
    }

    await streamHandler({ params: { provider: 'spotify' } }, response)

    expect(writeCount).toBeGreaterThanOrEqual(2)
    const written = vi.mocked(response.write).mock.calls.map((c) => c[0] as string).join('')
    expect(written).toContain('"type":"done"')
    expect(response.end).toHaveBeenCalled()
  })

  it('GET /api/csrf-token uses res.locals._csrf when req.csrfToken is not a function', async () => {
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
    const csrfHandler = findRouteHandler(app, 'get', '/api/csrf-token')
    const res = {
      json: vi.fn(),
      locals: { _csrf: 'csrf-from-res-locals' },
    }
    await csrfHandler({} as never, res as never)
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      csrfToken: 'csrf-from-res-locals',
    })
  })

  it('GET /api/user/profile route handler no-ops when req.user is missing (defensive)', async () => {
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
    const handler = findRouteHandler(app, 'get', '/api/user/profile')
    const res = createResponse()
    await handler({ user: undefined } as never, res as never)
    expect(authService.getUser).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })

  it('DELETE /api/user/account route handler no-ops when req.user is missing (defensive)', async () => {
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
    const handler = findRouteHandler(app, 'delete', '/api/user/account')
    const res = createResponse()
    await handler({ user: undefined } as never, res as never)
    expect(authService.deleteUser).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })

  it('POST /api/auth/logout route handler no-ops when req.user is missing (defensive)', async () => {
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
    const handler = findRouteHandler(app, 'post', '/api/auth/logout')
    const res = createResponse()
    await handler({ user: undefined } as never, res as never)
    expect(authService.revokeRefreshTokens).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })
})
