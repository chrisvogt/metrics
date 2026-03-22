import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import lusca from 'lusca'
import path from 'path'
import { rateLimit } from 'express-rate-limit'

import type { AuthService } from '../ports/auth-service.js'
import type { DocumentStore } from '../ports/document-store.js'
import type { MediaStore } from '../ports/media-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { getWidgetUserIdForHostname } from '../config/backend-paths.js'
import { isProductionEnvironment } from '../config/backend-config.js'
import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'
import { getRateLimitKey } from '../middleware/rate-limit-key.js'
import type { SyncProviderId, WidgetContentUnion } from '../types/widget-content.js'
import { isSyncProviderId, isWidgetId, widgetIds } from '../types/widget-content.js'
import deleteUserJob from '../jobs/delete-user.js'
import { runSyncForProvider } from '../services/sync-manual.js'
import type { ManualSyncResult } from '../services/sync-manual.js'
import { getWidgetContent } from '../widgets/get-widget-content.js'
import { createCookieBackedCsrfImpl } from './cookie-backed-csrf.js'

interface LoggerLike {
  error: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
}

interface CreateExpressAppOptions {
  authService: AuthService
  documentStore: DocumentStore
  ensureRuntimeConfigApplied: () => Promise<void>
  getClientAuthConfig: () => Record<string, string | undefined>
  logger: LoggerLike
  resolveMediaStore: () => MediaStore
  syncJobQueue: SyncJobQueue
}

const rateLimitMessage = { ok: false, error: 'Too many requests. Please try again later.' }

function createRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    limit: max,
    message: rateLimitMessage,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getRateLimitKey,
  })
}

const buildSuccessResponse = <TPayload>(
  payload: TPayload
): { ok: true; payload: TPayload } => ({
    ok: true,
    payload,
  })

const buildFailureResponse = (err: unknown = {}): { ok: false; error: string } => ({
  ok: false,
  error:
    err instanceof Error
      ? err.message
      : (err as { message?: string })?.message ?? String(err),
})

const ALLOWED_EMAIL_DOMAINS = ['@chrisvogt.me', '@chronogrove.com']
const CSRF_SECRET_COOKIE = '_csrfSecret'

/** Public widget reads: skip CSRF so lusca does not set cookies (would prevent CDN caching). */
const CSRF_EXCLUDED_PATHS_WIDGET_READS = widgetIds.map((id) => ({
  path: `/api/widgets/${id}`,
  type: 'exact' as const,
}))
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false
  if (!isProductionEnvironment()) return true
  return ALLOWED_EMAIL_DOMAINS.some((domain) => email.endsWith(domain))
}

export function getSessionAuthError(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'No valid authorization token provided'
  }
  const token = extractBearerToken(authHeader) ?? ''
  if (!token) return 'No token'
  return null
}

export function createExpressApp({
  authService,
  documentStore,
  ensureRuntimeConfigApplied,
  getClientAuthConfig,
  logger,
  resolveMediaStore,
  syncJobQueue,
}: CreateExpressAppOptions): express.Express {
  const expressApp = express()

  const authenticateUser = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    logger.info('Authenticating user', {
      headers: req.headers,
      cookies: req.cookies,
    })
    try {
      const sessionCookie = req.cookies?.session
      if (sessionCookie) {
        logger.info('Session cookie found, attempting verification', {
          cookieLength: sessionCookie.length,
          cookieStart: sessionCookie.substring(0, 50),
          cookieEnd: sessionCookie.substring(sessionCookie.length - 50),
        })

        try {
          const decodedClaims = await authService.verifySessionCookie(sessionCookie)

          logger.info('Session cookie verified successfully', {
            uid: decodedClaims.uid,
            email: decodedClaims.email,
            emailVerified: decodedClaims.emailVerified,
          })

          if (!isAllowedEmail(decodedClaims.email)) {
            logger.warn('Email domain rejected', {
              email: decodedClaims.email,
              uid: decodedClaims.uid,
            })
            res.status(403).json({
              ok: false,
              error:
                'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
            })
            return
          }

          req.user = {
            uid: decodedClaims.uid,
            email: decodedClaims.email,
            emailVerified: decodedClaims.emailVerified,
          }
          next()
          return
        } catch (error) {
          logger.error('Session cookie verification failed', {
            error: error instanceof Error ? error.message : '',
            code: (error as { code?: string }).code,
            stack: error instanceof Error ? error.stack : undefined,
          })
        }
      }

      const authHeader = req.headers.authorization
      const token = extractBearerToken(authHeader)
      if (!token) {
        logger.warn('No valid authorization header found', {
          hasAuthHeader: !!req.headers.authorization,
          authHeaderStart: req.headers.authorization?.substring(0, 20),
        })
        res.status(401).json({
          ok: false,
          error: 'No valid authorization header found',
        })
        return
      }

      logger.info('JWT token found, attempting verification')

      try {
        const decodedToken = await authService.verifyIdToken(token)

        logger.info('JWT token verified successfully', {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.emailVerified,
        })

        if (!isAllowedEmail(decodedToken.email)) {
          logger.warn('JWT email domain rejected', {
            email: decodedToken.email,
            uid: decodedToken.uid,
          })
          res.status(403).json({
            ok: false,
            error:
              'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
          })
          return
        }

        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.emailVerified,
        }
        next()
      } catch (error) {
        logger.error('JWT token verification failed', {
          error: error instanceof Error ? error.message : '',
          code: (error as { code?: string }).code,
        })
        res.status(401).json({
          ok: false,
          error: 'Invalid or expired JWT token',
        })
      }
    } catch (error) {
      logger.error('Authentication error:', {
        error: error instanceof Error ? error.message : '',
        code: (error as { code?: string }).code,
        uid: req.user?.uid ?? 'unknown',
      })
      res.status(401).json({
        ok: false,
        error: 'Invalid or expired token',
      })
    }
  }

  expressApp.use(compression())
  expressApp.use(cookieParser())
  expressApp.use(
    lusca.csrf({
      angular: true,
      secret: CSRF_SECRET_COOKIE,
      blocklist: CSRF_EXCLUDED_PATHS_WIDGET_READS,
      impl: createCookieBackedCsrfImpl({
        httpOnly: true,
        sameSite: isProductionEnvironment() ? 'strict' : 'lax',
        secure: isProductionEnvironment(),
      }),
      cookie: {
        options: {
          httpOnly: false,
          sameSite: isProductionEnvironment() ? 'strict' : 'lax',
          secure: isProductionEnvironment(),
        },
      },
    })
  )

  const corsAllowList: RegExp[] = [
    /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
    /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
    /^https?:\/\/([a-z0-9-]+--)?chrisvogt\.netlify\.app$/,
    /https?:\/\/([a-z0-9]+[.])*chronogrove[.]com$/,
    /https?:\/\/([a-z0-9]+[.])*dev-chronogrove[.]com$/,
  ]

  if (!isProductionEnvironment()) {
    corsAllowList.push(/localhost:?(\d+)?$/)
  }

  const corsOptions = {
    origin: corsAllowList,
    credentials: true,
  }

  const runSyncHandler = async (
    provider: SyncProviderId
  ): Promise<ManualSyncResult> => runSyncForProvider({
    documentStore,
    provider,
    syncJobQueue,
  })

  expressApp.get(
    '/api/media/{*mediaPath}',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 100),
    async (req, res) => {
      const mediaStore = resolveMediaStore()
      if (!(mediaStore instanceof LocalDiskMediaStore)) {
        res.sendStatus(404)
        return
      }

      const mediaPathParam = req.params.mediaPath
      const mediaPath = Array.isArray(mediaPathParam)
        ? mediaPathParam.join('/')
        : mediaPathParam
      if (!mediaPath || typeof mediaPath !== 'string') {
        res.sendStatus(404)
        return
      }

      const storeRoot = path.resolve(mediaStore.describe().target)
      const absolutePath = path.resolve(mediaStore.resolveAbsolutePath(mediaPath))
      const allowedPrefix = `${storeRoot}${path.sep}`

      if (absolutePath !== storeRoot && !absolutePath.startsWith(allowedPrefix)) {
        res.sendStatus(404)
        return
      }

      res.sendFile(absolutePath, (error) => {
        if (!error) {
          return
        }

        const sendFileError = error as Error & { code?: string }

        if (!res.headersSent) {
          res.sendStatus(sendFileError.code === 'ENOENT' ? 404 : 500)
        }
      })
    }
  )

  expressApp.get(
    '/api/widgets/sync/:provider',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 10),
    async (req, res) => {
      const providerParam = req.params.provider
      const provider = typeof providerParam === 'string' ? providerParam : undefined

      if (!provider || !isSyncProviderId(provider)) {
        logger.info(`Attempted to sync an unrecognized provider: ${provider}`)
        res.status(400).send('Unrecognized or unsupported provider.')
        return
      }

      try {
        const result = await runSyncHandler(provider)
        res.status(200).send(result)
      } catch (err) {
        logger.error(`Error syncing ${provider} data.`, err)
        res.status(500).send({ error: err })
      }
    }
  )

  expressApp.get('/api/widgets/:provider', cors(corsOptions), async (req, res) => {
    const provider = req.params.provider

    if (!provider || !isWidgetId(provider)) {
      const response = buildFailureResponse({
        message: 'A valid provider type is required.',
      })
      res.status(404).send(response)
      res.end()
      return
    }

    const originalHostname = (req.headers['x-forwarded-host'] as string) || req.hostname
    const userId = getWidgetUserIdForHostname(originalHostname)

    try {
      const widgetContent: WidgetContentUnion =
        await getWidgetContent(provider, userId, documentStore)
      const response = buildSuccessResponse(widgetContent)
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')
      res.status(200).send(response)
    } catch (err) {
      logger.error('Error loading widget content', {
        provider,
        userId,
        error: err instanceof Error ? err.message : err,
      })
      const response = buildFailureResponse(err)
      res.status(500).send(response)
    }

    res.end()
  })

  expressApp.get(
    '/api/user/profile',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 50),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      try {
        const userRecord = await authService.getUser(req.user.uid)
        const response = buildSuccessResponse(userRecord)
        res.status(200).send(response)
      } catch (err) {
        logger.error('Error fetching user profile:', err)
        res.status(500).send(buildFailureResponse(err))
      }
    }
  )

  expressApp.delete(
    '/api/user/account',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 5),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      try {
        const result = await deleteUserJob({ uid }, documentStore)
        if (result.result !== 'SUCCESS') {
          logger.warn('Delete-account: Firestore cleanup failed (doc may be missing)', {
            uid,
            error: result.error,
          })
        }
        await authService.deleteUser(uid)
        logger.info('User account deleted', { uid })
        res.status(200).send(buildSuccessResponse({ message: 'Account deleted' }))
      } catch (err) {
        logger.error('Error deleting account', { uid, error: err })
        res.status(500).send(buildFailureResponse(err))
      }
    }
  )

  expressApp.post(
    '/api/auth/session',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 20),
    async (req, res) => {
      try {
        const authError = getSessionAuthError(req.headers.authorization)
        if (authError) {
          res.status(401).json({ ok: false, error: authError })
          return
        }

        const token = extractBearerToken(req.headers.authorization)
        if (!token) {
          res.status(401).json({ ok: false, error: 'No token' })
          return
        }

        const decodedToken = await authService.verifyIdToken(token)

        if (!isAllowedEmail(decodedToken.email)) {
          res.status(403).json({
            ok: false,
            error:
              'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
          })
          return
        }

        logger.info('Creating session cookie for user', {
          uid: decodedToken.uid,
          email: decodedToken.email,
        })

        const expiresIn = 60 * 60 * 24 * 5 * 1000
        const sessionCookie = await authService.createSessionCookie(token, { expiresIn })

        const options = {
          maxAge: expiresIn,
          httpOnly: true,
          secure: isProductionEnvironment(),
          sameSite: (isProductionEnvironment() ? 'strict' : 'lax') as 'strict' | 'lax',
          path: '/',
        }

        res.cookie('session', sessionCookie, options)

        res.status(200).send({
          ok: true,
          message: 'Session cookie created successfully',
        })
      } catch (err) {
        logger.error('Error creating session cookie:', err)
        res.status(500).send({
          ok: false,
          error: 'Failed to create session cookie',
        })
      }
    }
  )

  const sendClientAuthConfig = async (res: express.Response) => {
    await ensureRuntimeConfigApplied()
    const config = getClientAuthConfig()
    res.json(config)
  }

  expressApp.get(
    '/api/client-auth-config',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 20),
    async (_req, res) => {
      await sendClientAuthConfig(res)
    }
  )

  expressApp.get(
    '/api/firebase-config',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 20),
    async (_req, res) => {
      await sendClientAuthConfig(res)
    }
  )

  expressApp.get('/api/csrf-token', cors(corsOptions), (req, res) => {
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : res.locals._csrf

    res.json({
      ok: true,
      csrfToken,
    })
  })

  expressApp.post(
    '/api/auth/logout',
    cors(corsOptions),
    createRateLimiter(15 * 60 * 1000, 30),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      try {
        await authService.revokeRefreshTokens(req.user.uid)
        res.clearCookie('session', {
          httpOnly: true,
          secure: isProductionEnvironment(),
          sameSite: isProductionEnvironment() ? 'strict' : 'lax',
          path: '/',
        })
        res.status(200).send({
          ok: true,
          message: 'User logged out successfully',
        })
      } catch (err) {
        logger.error('Error during logout:', err)
        res.status(500).send({
          ok: false,
          error: 'Logout failed',
        })
      }
    }
  )

  expressApp.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof Error && error.message.startsWith('CSRF token')) {
      res.status(403).json({
        ok: false,
        error: error.message,
      })
      return
    }

    next(error)
  })

  expressApp.get('/{*splat}', (_req, res) => {
    res.sendStatus(404)
    res.end()
  })

  return expressApp
}
