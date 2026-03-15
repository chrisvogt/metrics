import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'

const getMediaStoreMock = vi.hoisted(() => vi.fn())
const isDiskMediaStoreSelectedMock = vi.hoisted(() => vi.fn(() => true))

vi.mock('../selectors/media-store.js', () => ({
  getMediaStore: getMediaStoreMock,
  isDiskMediaStoreSelected: isDiskMediaStoreSelectedMock,
}))

vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn(() => (_req, _res, next) => next()),
}))

vi.mock('../jobs/delete-user.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-discogs-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-flickr-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-goodreads-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-instagram-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-spotify-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../jobs/sync-steam-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ result: 'SUCCESS' })),
}))

vi.mock('../widgets/get-widget-content.js', () => ({
  getWidgetContent: vi.fn(() => Promise.resolve({ mock: 'widget-content' })),
  validWidgetIds: ['spotify'],
}))

describe('createExpressApp media route', () => {
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  const admin = {
    auth: vi.fn(() => ({
      createSessionCookie: vi.fn(),
      deleteUser: vi.fn(),
      getUser: vi.fn(),
      revokeRefreshTokens: vi.fn(),
      verifyIdToken: vi.fn(),
      verifySessionCookie: vi.fn(),
    })),
  }

  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  }

  const buildApp = async () => {
    const { createExpressApp } = await import('./create-express-app.js')

    return createExpressApp({
      admin: admin as never,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getFirebaseClientConfig: vi.fn(() => ({})),
      logger,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    isDiskMediaStoreSelectedMock.mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 404 when disk media serving is disabled', async () => {
    const app = await buildApp()
    isDiskMediaStoreSelectedMock.mockReturnValue(false)

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
    const app = await buildApp()
    getMediaStoreMock.mockReturnValue({
      describe: () => ({ target: '/tmp/not-local' }),
      resolveAbsolutePath: () => '/tmp/not-local/cover.jpg',
    })

    await request(app)
      .get('/api/media/cover.jpg')
      .expect(404)
  })

  it('returns 404 when the resolved media path escapes the local media root', async () => {
    const app = await buildApp()
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-root-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)

    vi.spyOn(mediaStore, 'resolveAbsolutePath').mockReturnValue(
      path.join(rootDir, '..', 'outside.txt')
    )
    getMediaStoreMock.mockReturnValue(mediaStore)

    await request(app)
      .get('/api/media/cover.jpg')
      .expect(404)
  })

  it('serves files from the local media root and returns 404 when the file is missing', async () => {
    const app = await buildApp()
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-files-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    getMediaStoreMock.mockReturnValue(mediaStore)

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
    const app = await buildApp()
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-dir-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    getMediaStoreMock.mockReturnValue(mediaStore)

    fs.mkdirSync(path.join(rootDir, 'folder'))

    await request(app)
      .get('/api/media/folder')
      .expect(500)
  })

  it('does not overwrite the response when sendFile fails after headers are already sent', async () => {
    const app = await buildApp()
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-media-sent-'))
    const mediaStore = new LocalDiskMediaStore(rootDir)
    getMediaStoreMock.mockReturnValue(mediaStore)

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

  const authMethods = {
    createSessionCookie: vi.fn(),
    deleteUser: vi.fn(),
    getUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
  }

  const admin = {
    auth: vi.fn(() => authMethods),
  }

  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  }

  const buildApp = async () => {
    const { createExpressApp } = await import('./create-express-app.js')

    return createExpressApp({
      admin: admin as never,
      documentStore,
      ensureRuntimeConfigApplied: vi.fn().mockResolvedValue(undefined),
      getFirebaseClientConfig: vi.fn(() => ({})),
      logger,
    })
  }

  async function getCsrfHeaders(app: Awaited<ReturnType<typeof buildApp>>) {
    const agent = request.agent(app)
    const response = await agent.get('/api/csrf-token').expect(200)
    const cookies = (response.headers['set-cookie'] as string[]).map((cookie) => cookie.split(';', 1)[0]!)

    return {
      agent,
      csrfToken: response.body.csrfToken as string,
      cookies,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
    isDiskMediaStoreSelectedMock.mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NODE_ENV = 'test'
  })

  it('creates a strict secure session cookie in production', async () => {
    process.env.NODE_ENV = 'production'
    const app = await buildApp()

    authMethods.verifyIdToken.mockResolvedValue({
      uid: 'prod-user',
      email: 'prod@chrisvogt.me',
      email_verified: true,
    })
    authMethods.createSessionCookie.mockResolvedValue('prod-session-cookie')

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

    authMethods.verifyIdToken.mockResolvedValue({
      uid: 'prod-user',
      email: 'prod@chrisvogt.me',
      email_verified: true,
    })
    authMethods.revokeRefreshTokens.mockResolvedValue(undefined)

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

    authMethods.verifySessionCookie.mockRejectedValue({
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

    authMethods.verifyIdToken.mockRejectedValue({
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
})
