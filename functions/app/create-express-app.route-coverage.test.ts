import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'

vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn(() => (_req, _res, next) => next?.()),
}))

vi.mock('../jobs/sync-discogs-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'discogs' })),
}))

vi.mock('../jobs/sync-flickr-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'flickr' })),
}))

vi.mock('../jobs/sync-goodreads-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'goodreads' })),
}))

vi.mock('../jobs/sync-instagram-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'instagram' })),
}))

vi.mock('../jobs/sync-spotify-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'spotify' })),
}))

vi.mock('../jobs/sync-steam-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS', provider: 'steam' })),
}))

vi.mock('../jobs/delete-user.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../widgets/get-widget-content.js', () => ({
  getWidgetContent: vi.fn(() => Promise.resolve({ ok: true })),
  validWidgetIds: ['spotify'],
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
      mediaStore: new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
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

  it.each([
    ['discogs', '../jobs/sync-discogs-data.js'],
    ['goodreads', '../jobs/sync-goodreads-data.js'],
    ['instagram', '../jobs/sync-instagram-data.js'],
    ['steam', '../jobs/sync-steam-data.js'],
  ])('dispatches the %s sync route through the injected document store', async (provider, modulePath) => {
    const { createExpressApp } = await import('./create-express-app.js')
    const app = createExpressApp({
      authService,
      documentStore,
      ensureRuntimeConfigApplied,
      getClientAuthConfig,
      logger,
      mediaStore: new LocalDiskMediaStore('/tmp/metrics-unused-route-coverage'),
    })
    const syncRouteHandler = findRouteHandler(app, 'get', '/api/widgets/sync/:provider')
    const response = createResponse()
    const jobModule = await import(modulePath)

    await syncRouteHandler({ params: { provider } }, response)

    expect(jobModule.default).toHaveBeenCalledWith(documentStore)
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.send).toHaveBeenCalledWith({ result: 'SUCCESS', provider })
  })
})
