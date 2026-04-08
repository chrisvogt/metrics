import compressionImport from 'compression'
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
import { getWidgetUserIdForHostname, getUsersCollectionPath } from '../config/backend-paths.js'
import { isProductionEnvironment } from '../config/backend-config.js'
import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'
import { getRateLimitKey } from '../middleware/rate-limit-key.js'
import type { SyncProviderId } from '../types/widget-content.js'
import { isSyncProviderId, isWidgetId, widgetIds } from '../types/widget-content.js'
import deleteUserJob from '../jobs/delete-user.js'
import { runSyncForProvider } from '../services/sync-manual.js'
import type { ManualSyncResult } from '../services/sync-manual.js'
import { getWidgetContent } from '../widgets/get-widget-content.js'
import { createCookieBackedCsrfImpl } from './cookie-backed-csrf.js'
import { TENANT_USERNAMES_COLLECTION } from '../config/future-tenant-collections.js'
import {
  loadOnboardingStateForApi,
  persistOnboardingWizardState,
} from '../services/onboarding-wizard-persistence.js'
import {
  ONBOARDING_USERNAME_PATTERN,
  parseOnboardingProgressBody,
} from './onboarding-progress.js'
import { registerDiscogsOAuthRoutes } from './oauth-discogs.js'
import { registerFlickrOAuthRoutes } from './oauth-flickr.js'
import { registerGitHubOAuthRoutes } from './oauth-github.js'
import { toStoredDateTime } from '../utils/time.js'
import { hostnameCnameChainsTo } from '../utils/dns-cname-verify.js'
import { resolveWidgetDataUserIdFromPublicQuery } from './resolve-widget-data-user-id.js'

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

const DEFAULT_USER_UI_THEME = 'sonoran-dusk'
const USER_UI_THEMES = new Set(['sonoran-dusk', 'starry-night'])

const ONBOARDING_USERNAME_RATE_WINDOW_MS = 15 * 60 * 1000
/** Username checks are enumerable; keep a stricter cap than generic read APIs. */
const ONBOARDING_USERNAME_RATE_LIMIT = 30
const ONBOARDING_DOMAIN_RATE_WINDOW_MS = 15 * 60 * 1000
/** DNS probes are costlier than username lookups; limit harder. */
const ONBOARDING_DOMAIN_RATE_LIMIT = 20

/** Shared options for `express-rate-limit` — use `rateLimit({ ...rateLimitDefaults, ... })` at each route so CodeQL `js/missing-rate-limiting` recognizes guards. */
const rateLimitDefaults = {
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
} as const

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

/** Production gate: revisit domain allowlist, MFA, and Firebase Auth policies before a public launch. */
const ALLOWED_EMAIL_DOMAINS = ['@chrisvogt.me', '@chronogrove.com']
const CSRF_SECRET_COOKIE = '_csrfSecret'

/** `compression` supports options + `.filter` at runtime; default typings are incomplete. */
type CompressionMiddleware = ((
  options?: { filter?: (req: express.Request, res: express.Response) => boolean }
) => express.RequestHandler) & {
  filter: (req: express.Request, res: express.Response) => boolean
}
const compression = compressionImport as unknown as CompressionMiddleware

/**
 * Skip gzip/brotli on manual sync SSE so chunks flush immediately.
 * @public — unit-tested; keep in sync with `compression({ filter })` below.
 */
export function metricsCompressionFilter(
  req: express.Request,
  res: express.Response,
  defaultFilter: (req: express.Request, res: express.Response) => boolean,
): boolean {
  const pathStr = req.path ?? req.url ?? ''
  if (pathStr.includes('/api/widgets/sync/') && pathStr.endsWith('/stream')) {
    return false
  }
  return defaultFilter(req, res)
}

/** Public widget reads: skip CSRF so lusca does not set cookies (would prevent CDN caching). */
const CSRF_EXCLUDED_PATHS_WIDGET_READS = [
  ...widgetIds.map((id) => ({
    path: `/api/widgets/${id}`,
    type: 'exact' as const,
  })),
  { path: '/api/onboarding/check-username', type: 'exact' as const },
  { path: '/api/onboarding/check-domain', type: 'exact' as const },
  /** Flickr redirects here without CSRF headers. */
  { path: '/api/oauth/flickr/callback', type: 'exact' as const },
  /** Discogs redirects here without CSRF headers. */
  { path: '/api/oauth/discogs/callback', type: 'exact' as const },
]
/** Host or left label before the first `:port` segment (IPv6-in-headers stays consistent with prior `split(':')[0]` usage). */
function hostPortFirst(hostOrHostPort: string): string {
  const colon = hostOrHostPort.indexOf(':')
  const host = colon === -1 ? hostOrHostPort : hostOrHostPort.slice(0, colon)
  return host.toLowerCase()
}

/**
 * When the request's own Host / X-Forwarded-Host already name a tenant-facing entrypoint,
 * `x-chronogrove-public-host` must not override them (any client could set that header).
 * SSR status probes call the Functions URL directly; there the Host is infrastructure-only,
 * so the console-sent probe header is applied.
 */
function isInfrastructurePublicWidgetHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (!h) {
    return true
  }
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h === '[::1]' ||
    h === '::ffff:127.0.0.1' ||
    h === '[::ffff:127.0.0.1]'
  ) {
    return true
  }
  if (h.endsWith('.cloudfunctions.net')) {
    return true
  }
  if (h.endsWith('.run.app')) {
    return true
  }
  return false
}

/**
 * Hostname for widget user resolution: `X-Forwarded-Host` (first hop), then `Host` / `req.hostname`.
 * `x-chronogrove-public-host` is honored only when that primary hostname looks like an internal
 * Functions / Cloud Run / loopback target (set by the console SSR widget status fetch).
 */
function resolveOriginalRequestHostname(req: express.Request): string {
  const probeRaw = (req.headers['x-chronogrove-public-host'] as string | undefined)
    ?.split(',')[0]
    ?.trim()
  const probeParsed = probeRaw ? hostPortFirst(probeRaw) : ''

  const xfRaw = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim()
  const fromForwarded = xfRaw ? hostPortFirst(xfRaw) : ''
  const fromHost = (req.hostname || '').toLowerCase()

  const primary = fromForwarded || fromHost

  if (probeParsed && isInfrastructurePublicWidgetHostname(primary)) {
    return probeParsed
  }
  if (fromForwarded) {
    return fromForwarded
  }
  return fromHost
}

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

/** Stable client-facing code when session/API is blocked until the user verifies their email. */
export const API_ERROR_EMAIL_NOT_VERIFIED = 'email_not_verified' as const

/** True when the account is allowed for this app but the email is explicitly unverified (password sign-ups). */
export function needsEmailVerification(
  email: string | undefined | null,
  emailVerified: boolean | undefined
): boolean {
  return isAllowedEmail(email) && emailVerified === false
}

export const requireVerifiedEmail: express.RequestHandler = (req, res, next) => {
  const u = req.user
  if (!u) {
    next()
    return
  }
  if (needsEmailVerification(u.email, u.emailVerified)) {
    res.status(403).json({ ok: false, error: API_ERROR_EMAIL_NOT_VERIFIED })
    return
  }
  next()
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

  /**
   * Same identity as authenticated API routes: session cookie first, then Bearer ID token.
   * Used by public onboarding endpoints to recognize the signed-in user without requiring auth.
   */
  const resolveViewerUidForPublicOnboarding = async (
    req: express.Request
  ): Promise<string | null> => {
    const sessionCookie = req.cookies?.session
    if (sessionCookie) {
      try {
        const decoded = await authService.verifySessionCookie(sessionCookie)
        if (
          decoded.uid &&
          isAllowedEmail(decoded.email) &&
          !needsEmailVerification(decoded.email, decoded.emailVerified)
        ) {
          return decoded.uid
        }
      } catch {
        /* treat as anonymous */
      }
    }
    const token = extractBearerToken(req.headers.authorization)
    if (token) {
      try {
        const decoded = await authService.verifyIdToken(token)
        if (
          decoded.uid &&
          isAllowedEmail(decoded.email) &&
          !needsEmailVerification(decoded.email, decoded.emailVerified)
        ) {
          return decoded.uid
        }
      } catch {
        /* treat as anonymous */
      }
    }
    return null
  }

  const authenticateUser = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    try {
      const sessionCookie = req.cookies?.session
      if (sessionCookie) {
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
          path: req.path,
          hasAuthHeader: Boolean(req.headers.authorization),
        })
        res.status(401).json({
          ok: false,
          error: 'No valid authorization header found',
        })
        return
      }

      logger.info('auth: bearer token', { path: req.path })

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

  expressApp.use(
    compression({
      filter: (req, res) => metricsCompressionFilter(req, res, compression.filter),
    })
  )
  expressApp.use(cookieParser())

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

  /**
   * Run before CSRF so OPTIONS preflight for `/api` is answered here (cors ends the response).
   * Per-route `cors()` on `app.get()` only does not run for OPTIONS, so cross-origin fetches with
   * `Authorization` (e.g. sync SSE to `*.cloudfunctions.net`) would otherwise fail CORS.
   */
  expressApp.use('/api', cors(corsOptions))

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

  registerFlickrOAuthRoutes({
    expressApp,
    authenticateUser,
    requireVerifiedEmail,
    documentStore,
    logger,
    isProductionEnvironment: isProductionEnvironment(),
    allowedEmailDomains: ALLOWED_EMAIL_DOMAINS,
  })

  registerDiscogsOAuthRoutes({
    expressApp,
    authenticateUser,
    requireVerifiedEmail,
    documentStore,
    logger,
    isProductionEnvironment: isProductionEnvironment(),
    allowedEmailDomains: ALLOWED_EMAIL_DOMAINS,
  })

  registerGitHubOAuthRoutes({
    expressApp,
    authenticateUser,
    requireVerifiedEmail,
    documentStore,
    logger,
    isProductionEnvironment: isProductionEnvironment(),
    allowedEmailDomains: ALLOWED_EMAIL_DOMAINS,
  })

  const runSyncHandler = async (
    provider: SyncProviderId,
    integrationLookupUserId?: string
  ): Promise<ManualSyncResult> => runSyncForProvider({
    documentStore,
    provider,
    syncJobQueue,
    ...(integrationLookupUserId ? { integrationLookupUserId } : {}),
  })

  expressApp.get(
    '/api/media/{*mediaPath}',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 100 }),
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
    '/api/widgets/sync/:provider/stream',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 10 }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      const providerParam = req.params.provider
      const provider = typeof providerParam === 'string' ? providerParam : undefined

      if (!provider || !isSyncProviderId(provider)) {
        logger.info(`Attempted to sync stream for an unrecognized provider: ${provider}`)
        res.status(400).send('Unrecognized or unsupported provider.')
        return
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      const writeEvent = (payload: unknown) => {
        try {
          res.write(`data: ${JSON.stringify(payload)}\n\n`)
        } catch {
          // Client disconnected
        }
      }

      try {
        const result = await runSyncForProvider({
          documentStore,
          provider,
          syncJobQueue,
          ...(req.user?.uid ? { integrationLookupUserId: req.user.uid } : {}),
          onProgress: (event) => writeEvent({ type: 'progress', ...event }),
        })
        writeEvent({ type: 'done', result })
      } catch (err) {
        logger.error(`Error syncing ${provider} data (SSE).`, err)
        writeEvent({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      } finally {
        res.end()
      }
    }
  )

  expressApp.get(
    '/api/widgets/sync/:provider',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 10 }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      const providerParam = req.params.provider
      const provider = typeof providerParam === 'string' ? providerParam : undefined

      if (!provider || !isSyncProviderId(provider)) {
        logger.info(`Attempted to sync an unrecognized provider: ${provider}`)
        res.status(400).send('Unrecognized or unsupported provider.')
        return
      }

      try {
        const result = await runSyncHandler(provider, req.user?.uid)
        res.status(200).send(result)
      } catch (err) {
        logger.error(`Error syncing ${provider} data.`, err)
        res.status(500).send({ error: err })
      }
    }
  )

  expressApp.get(
    '/api/widgets/:provider',
    rateLimit({
      ...rateLimitDefaults,
      windowMs: 15 * 60 * 1000,
      limit: 100,
      // One bucket per path so parallel SSR status checks (one request per provider) do not share
      // a single IP+route counter and trip 429/empty failures.
      keyGenerator: (req) => `${getRateLimitKey(req)}:${req.path}`,
    }),
    async (req, res) => {
      const providerParam = req.params.provider
      const provider =
        typeof providerParam === 'string'
          ? providerParam
          : Array.isArray(providerParam)
            ? providerParam[0]
            : undefined

      if (!provider || !isWidgetId(provider)) {
        res.status(404).json(
          buildFailureResponse({
            message: 'A valid provider type is required.',
          }),
        )
        return
      }

      let originalHostname: string
      let fromQuery: Awaited<ReturnType<typeof resolveWidgetDataUserIdFromPublicQuery>>
      try {
        originalHostname = resolveOriginalRequestHostname(req)
        fromQuery = await resolveWidgetDataUserIdFromPublicQuery(req, documentStore)
      } catch (err) {
        logger.error('Error resolving public widget user', {
          provider,
          error: err instanceof Error ? err.message : err,
        })
        res.status(500).json(buildFailureResponse(err))
        return
      }

      if (fromQuery === 'not_found') {
        res.status(404).json(buildFailureResponse({ message: 'Unknown user.' }))
        return
      }
      const userId =
        fromQuery === 'skip' ? getWidgetUserIdForHostname(originalHostname) : fromQuery.userId
      const viewerUid = await resolveViewerUidForPublicOnboarding(req)

      try {
        const { payload: widgetContent, meta } = await getWidgetContent(provider, userId, documentStore, {
          integrationLookupUserId: viewerUid ?? undefined,
        })
        const response = {
          ...buildSuccessResponse(widgetContent),
          ...(meta?.githubAuthMode ? { githubAuthMode: meta.githubAuthMode } : {}),
        }
        // Always revalidate at the client, while allowing short shared-cache freshness.
        res.set(
          'Cache-Control',
          'public, max-age=0, s-maxage=300, must-revalidate, stale-while-revalidate=60',
        )
        res.status(200).json(response)
      } catch (err) {
        logger.error('Error loading widget content', {
          provider,
          userId,
          error: err instanceof Error ? err.message : err,
        })
        const response = buildFailureResponse(err)
        res.status(500).json(response)
      }
    }
  )

  expressApp.get(
    '/api/user/profile',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 50 }),
    authenticateUser,
    requireVerifiedEmail,
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

  expressApp.get(
    '/api/user/settings',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 80 }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const userPath = `${getUsersCollectionPath()}/${uid}`
      try {
        const doc = await documentStore.getDocument<Record<string, unknown>>(userPath)
        const raw = doc?.settings
        const settings =
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {}
        let theme: string =
          typeof settings.theme === 'string' ? settings.theme : DEFAULT_USER_UI_THEME
        if (!USER_UI_THEMES.has(theme)) theme = DEFAULT_USER_UI_THEME
        res.status(200).json(buildSuccessResponse({ theme }))
      } catch (err) {
        logger.error('Error loading user settings', { uid, error: err })
        res.status(500).json(buildFailureResponse(err))
      }
    }
  )

  expressApp.patch(
    '/api/user/settings',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 40 }),
    express.json({ limit: '8kb' }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const themeRaw = (req.body as { theme?: unknown })?.theme
      if (typeof themeRaw !== 'string' || !USER_UI_THEMES.has(themeRaw)) {
        res.status(400).json({ ok: false, error: 'Invalid theme' })
        return
      }
      if (!documentStore.mergeDocument) {
        res.status(500).json({ ok: false, error: 'Settings merge not available' })
        return
      }
      const userPath = `${getUsersCollectionPath()}/${uid}`
      try {
        const doc = await documentStore.getDocument<Record<string, unknown>>(userPath)
        const rawPrev = doc?.settings
        const prev =
          rawPrev && typeof rawPrev === 'object' && !Array.isArray(rawPrev)
            ? { ...(rawPrev as Record<string, unknown>) }
            : {}
        await documentStore.mergeDocument(userPath, {
          settings: { ...prev, theme: themeRaw },
          updatedAt: toStoredDateTime(),
        })
        res.status(200).json(buildSuccessResponse({ theme: themeRaw }))
      } catch (err) {
        logger.error('Error saving user settings', { uid, error: err })
        res.status(500).json(buildFailureResponse(err))
      }
    }
  )

  expressApp.delete(
    '/api/user/account',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 5 }),
    authenticateUser,
    requireVerifiedEmail,
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

  expressApp.get(
    '/api/onboarding/progress',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 60 }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const userPath = `${getUsersCollectionPath()}/${uid}`
      try {
        const doc = await documentStore.getDocument<Record<string, unknown>>(userPath)
        const progress = await loadOnboardingStateForApi({
          usersCollection: getUsersCollectionPath(),
          uid,
          userDoc: doc,
        })
        res.status(200).json(buildSuccessResponse(progress))
      } catch (err) {
        logger.error('Error loading onboarding progress', { uid, error: err })
        res.status(500).json(buildFailureResponse(err))
      }
    }
  )

  expressApp.put(
    '/api/onboarding/progress',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 40 }),
    express.json(),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const parsed = parseOnboardingProgressBody(req.body)
      if (parsed.ok === false) {
        res.status(400).json({ ok: false, error: parsed.error })
        return
      }
      try {
        await persistOnboardingWizardState({
          usersCollection: getUsersCollectionPath(),
          uid,
          parsed: parsed.value,
        })
        const userPath = `${getUsersCollectionPath()}/${uid}`
        const userDoc = await documentStore.getDocument<Record<string, unknown>>(userPath)
        const progress = await loadOnboardingStateForApi({
          usersCollection: getUsersCollectionPath(),
          uid,
          userDoc,
        })
        res.status(200).json(buildSuccessResponse(progress))
      } catch (err) {
        if (err instanceof Error && err.message === 'username_taken') {
          res.status(409).json({ ok: false, error: 'Username is already taken' })
          return
        }
        if (err instanceof Error && err.message === 'hostname_taken') {
          res.status(409).json({ ok: false, error: 'That hostname is already claimed' })
          return
        }
        if (err instanceof Error && err.message === 'custom_domain_not_entitled') {
          res.status(403).json({ ok: false, error: 'Custom domain is not enabled for this account' })
          return
        }
        logger.error('Error saving onboarding progress', { uid, error: err })
        res.status(500).json(buildFailureResponse(err))
      }
    }
  )

  expressApp.post(
    '/api/auth/session',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 20 }),
    async (req, res) => {
      try {
        const authError = getSessionAuthError(req.headers.authorization)
        if (authError) {
          res.status(401).json({ ok: false, error: authError })
          return
        }

        const token = extractBearerToken(req.headers.authorization)!
        const decodedToken = await authService.verifyIdToken(token)

        if (!isAllowedEmail(decodedToken.email)) {
          res.status(403).json({
            ok: false,
            error:
              'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
          })
          return
        }

        if (needsEmailVerification(decodedToken.email, decodedToken.emailVerified)) {
          res.status(403).json({
            ok: false,
            error: API_ERROR_EMAIL_NOT_VERIFIED,
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
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 100 }),
    async (_req, res) => {
      await sendClientAuthConfig(res)
    }
  )

  expressApp.get(
    '/api/firebase-config',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 100 }),
    async (_req, res) => {
      await sendClientAuthConfig(res)
    }
  )

  expressApp.get('/api/csrf-token', (req, res) => {
    const csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : res.locals._csrf

    res.json({
      ok: true,
      csrfToken,
    })
  })

  expressApp.post(
    '/api/auth/logout',
    rateLimit({ ...rateLimitDefaults, windowMs: 15 * 60 * 1000, limit: 30 }),
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

  const DEFAULT_ONBOARDING_CNAME_TARGET = 'personal-stats-chrisvogt.web.app'
  const requiredCnameTarget = (() => {
    const raw = process.env.ONBOARDING_REQUIRED_CNAME_TARGET?.trim()
    if (!raw) return DEFAULT_ONBOARDING_CNAME_TARGET
    return raw.toLowerCase().replace(/\.$/, '')
  })()

  expressApp.get(
    '/api/onboarding/check-username',
    rateLimit({
      ...rateLimitDefaults,
      windowMs: ONBOARDING_USERNAME_RATE_WINDOW_MS,
      limit: ONBOARDING_USERNAME_RATE_LIMIT,
      handler: (
        request: express.Request,
        response: express.Response,
        _next: express.NextFunction,
        optionsUsed: { statusCode: number }
      ) => {
        logger.warn('rate_limit_exceeded', {
          label: 'onboarding_check_username',
          path: request.path,
        })
        response.status(optionsUsed.statusCode).json(rateLimitMessage)
      },
    }),
    async (req, res) => {
      const username = typeof req.query.username === 'string' ? req.query.username.toLowerCase() : ''

      if (!username || !ONBOARDING_USERNAME_PATTERN.test(username)) {
        res.status(400).json({ ok: false, error: 'Invalid username format' })
        return
      }

      try {
        const claimPath = `${TENANT_USERNAMES_COLLECTION}/${username}`
        const claim = await documentStore.getDocument<{ uid?: unknown }>(claimPath)

        if (claim && typeof claim.uid === 'string') {
          const viewerUid = await resolveViewerUidForPublicOnboarding(req)
          const ownedByCaller = viewerUid !== null && claim.uid === viewerUid
          if (!ownedByCaller) {
            res.json({ ok: true, available: false })
            return
          }
          res.json({ ok: true, available: true })
          return
        }

        if (!documentStore.legacyUsernameClaimed) {
          res.status(500).json({ ok: false, error: 'Username check unavailable' })
          return
        }
        const usersCollection = getUsersCollectionPath()

        if (documentStore.legacyUsernameOwnerUid) {
          const ownerUid = await documentStore.legacyUsernameOwnerUid(usersCollection, username)
          if (!ownerUid) {
            res.json({ ok: true, available: true })
            return
          }
          const viewerUid = await resolveViewerUidForPublicOnboarding(req)
          if (viewerUid !== null && ownerUid === viewerUid) {
            res.json({ ok: true, available: true })
            return
          }
          res.json({ ok: true, available: false })
          return
        }

        const legacyTaken = await documentStore.legacyUsernameClaimed(usersCollection, username)
        res.json({ ok: true, available: !legacyTaken })
      } catch (err) {
        logger.error('Error checking username availability', {
          usernameLength: username.length,
          error: err,
        })
        res.status(500).json(buildFailureResponse(err))
      }
    }
  )

  /** Read-only DNS probe — GET avoids CSRF (same pattern as check-username). */
  expressApp.get(
    '/api/onboarding/check-domain',
    rateLimit({
      ...rateLimitDefaults,
      windowMs: ONBOARDING_DOMAIN_RATE_WINDOW_MS,
      limit: ONBOARDING_DOMAIN_RATE_LIMIT,
      handler: (
        request: express.Request,
        response: express.Response,
        _next: express.NextFunction,
        optionsUsed: { statusCode: number }
      ) => {
        logger.warn('rate_limit_exceeded', {
          label: 'onboarding_check_domain',
          path: request.path,
        })
        response.status(optionsUsed.statusCode).json(rateLimitMessage)
      },
    }),
    async (req, res) => {
      const domain =
        typeof req.query.domain === 'string' ? req.query.domain.toLowerCase().trim() : ''

      if (!domain || domain.length > 253 || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain)) {
        res.status(400).json({ ok: false, error: 'Invalid domain format' })
        return
      }

      try {
        const verified = await hostnameCnameChainsTo(domain, requiredCnameTarget)

        res.json({
          ok: true,
          verified,
          requiredCname: requiredCnameTarget,
        })
      } catch (err) {
        logger.error('Error checking domain DNS', { domainLength: domain.length, error: err })
        res.status(500).json(buildFailureResponse(err))
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
