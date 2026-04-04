import type { DocumentStore } from '../ports/document-store.js'
import express from 'express'
import { rateLimit } from 'express-rate-limit'

import { getDiscogsOAuthConfig } from '../config/backend-config.js'
import {
  OAUTH_DISCOGS_PENDING_COLLECTION,
  USER_INTEGRATIONS_SEGMENT,
} from '../config/future-tenant-collections.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { toStoredDateTime } from '../utils/time.js'
import { encryptJsonEnvelope } from '../services/integration-token-crypto.js'
import {
  buildDiscogsAuthorizeUrl,
  discogsGetAccessToken,
  discogsGetIdentity,
  discogsGetRequestToken,
} from '../services/discogs-oauth1a.js'
import {
  DISCOGS_INTEGRATION_ID,
  type DiscogsOAuthCredentialPayload,
} from '../services/discogs-integration-credentials.js'
import { validateReturnTo, withDiscogsOAuthFlash } from '../services/oauth-return-path.js'
import { getRateLimitKey } from '../middleware/rate-limit-key.js'

const PENDING_TTL_MS = 15 * 60 * 1000

const rateLimitMessage = { ok: false, error: 'Too many requests. Please try again later.' }

const discogsOAuthRateLimitBase = {
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
} as const

/** OAuth 1.0a request token while status is `pending_oauth` (pending Firestore doc id). */
const DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD = 'oauthPendingRequestToken'

interface LoggerLike {
  error: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
}

function allowedEmail(email: string | undefined, isProduction: boolean, allowList: string[]): boolean {
  if (!email) return false
  if (!isProduction) return true
  return allowList.some((domain) => email.endsWith(domain))
}

export function resolveDiscogsOAuthPublicOrigin(req: express.Request): string {
  const explicit = process.env.PUBLIC_APP_ORIGIN?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost'
  const proto =
    (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
    (req.protocol === 'http' ? 'http' : 'https')
  return `${proto}://${host}`
}

export function resolveDiscogsOAuthRedirectUrl(req: express.Request, target: string): string {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target
  }
  const base = resolveDiscogsOAuthPublicOrigin(req)
  const path = target.startsWith('/') ? target : `/${target}`
  return `${base}${path}`
}

/**
 * Discogs OAuth 1.0a redirects the browser to this callback with `oauth_token` and `oauth_verifier`
 * in the query string only — the provider does not POST a body. We read those two keys, exchange
 * the verifier for access credentials server-side once, and never log the query or verifier.
 */
interface DiscogsOAuthCallbackQuery {
  oauthToken: string
  oauthVerifier: string
}

/** Only keys we accept on the Discogs callback; keeps reads off the full `Request['query']` shape. */
type DiscogsOAuthCallbackQueryRaw = {
  oauth_token?: unknown
  oauth_verifier?: unknown
}

function coerceOAuthQueryString(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

function readDiscogsOAuthCallbackQuery(query: express.Request['query']): DiscogsOAuthCallbackQuery {
  const raw = query as DiscogsOAuthCallbackQueryRaw
  return {
    oauthToken: coerceOAuthQueryString(raw.oauth_token),
    oauthVerifier: coerceOAuthQueryString(raw.oauth_verifier),
  }
}

export interface RegisterDiscogsOAuthOptions {
  expressApp: express.Express
  authenticateUser: express.RequestHandler
  requireVerifiedEmail: express.RequestHandler
  documentStore: DocumentStore
  logger: LoggerLike
  isProductionEnvironment: boolean
  allowedEmailDomains: string[]
}

export function registerDiscogsOAuthRoutes(opts: RegisterDiscogsOAuthOptions): void {
  const {
    expressApp,
    authenticateUser,
    requireVerifiedEmail,
    documentStore,
    logger,
    isProductionEnvironment,
    allowedEmailDomains,
  } = opts

  const usersPath = getUsersCollectionPath()

  expressApp.post(
    '/api/oauth/discogs/start',
    rateLimit({
      ...discogsOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 30,
    }),
    express.json({ limit: '4kb' }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const returnTo = validateReturnTo((req.body as { returnTo?: unknown } | undefined)?.returnTo)
      if (!allowedEmail(req.user.email, isProductionEnvironment, allowedEmailDomains)) {
        res.status(403).json({ ok: false, error: 'Forbidden' })
        return
      }

      let encryptionReady = true
      try {
        const { getIntegrationTokenMasterKeyBytes } = await import('../config/backend-config.js')
        getIntegrationTokenMasterKeyBytes()
      } catch {
        encryptionReady = false
      }

      const oauthCfg = getDiscogsOAuthConfig()
      if (!oauthCfg.consumerKey || !oauthCfg.consumerSecret || !oauthCfg.callbackUrl) {
        res.status(503).json({
          ok: false,
          error: 'Discogs OAuth is not configured on the server.',
        })
        return
      }
      if (!encryptionReady) {
        res.status(503).json({
          ok: false,
          error: 'Token encryption is not configured (INTEGRATION_TOKEN_MASTER_KEY).',
        })
        return
      }

      try {
        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${DISCOGS_INTEGRATION_ID}`
        const existing = await documentStore.getDocument<Record<string, unknown>>(integrationPath)
        if (existing?.status === 'connected') {
          res.status(400).json({ ok: false, error: 'Discogs is already linked for this account.' })
          return
        }

        const priorPending =
          typeof existing?.[DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD] === 'string'
            ? existing[DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD]
            : null
        if (priorPending && documentStore.deleteDocument) {
          const stalePendingPath = `${OAUTH_DISCOGS_PENDING_COLLECTION}/${encodeURIComponent(priorPending)}`
          try {
            await documentStore.deleteDocument(stalePendingPath)
          } catch {
            /* ignore */
          }
        }

        const { oauthToken, oauthTokenSecret } = await discogsGetRequestToken({
          consumerKey: oauthCfg.consumerKey,
          consumerSecret: oauthCfg.consumerSecret,
          oauthCallback: oauthCfg.callbackUrl,
        })

        const pendingPath = `${OAUTH_DISCOGS_PENDING_COLLECTION}/${encodeURIComponent(oauthToken)}`
        await documentStore.setDocument(pendingPath, {
          uid,
          oauthTokenSecret,
          createdAt: toStoredDateTime(),
          ...(returnTo ? { returnTo } : {}),
        })

        await documentStore.setDocument(integrationPath, {
          providerId: DISCOGS_INTEGRATION_ID,
          status: 'pending_oauth',
          [DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD]: oauthToken,
          updatedAt: toStoredDateTime(),
        })

        const authorizeUrl = buildDiscogsAuthorizeUrl(oauthToken)
        res.status(200).json({ ok: true, authorizeUrl })
      } catch (err) {
        logger.error('Discogs OAuth start failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not start Discogs authorization.' })
      }
    }
  )

  expressApp.get(
    '/api/oauth/discogs/callback',
    rateLimit({
      ...discogsOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 60,
    }),
    async (req, res) => {
      // Do not send OAuth query params onward as Referer on the next navigation.
      res.setHeader('Referrer-Policy', 'no-referrer')

      const { oauthToken, oauthVerifier } = readDiscogsOAuthCallbackQuery(req.query)

      let validatedReturnTo: string | null = null

      const failRedirect = (reason: string) => {
        const path = validatedReturnTo
          ? withDiscogsOAuthFlash(validatedReturnTo, 'error', reason)
          : withDiscogsOAuthFlash('/onboarding', 'error', reason)
        res.redirect(302, resolveDiscogsOAuthRedirectUrl(req, path))
      }

      if (!oauthToken || !oauthVerifier) {
        logger.warn('Discogs OAuth callback missing token or verifier')
        failRedirect('missing_token')
        return
      }

      const pendingPath = `${OAUTH_DISCOGS_PENDING_COLLECTION}/${encodeURIComponent(oauthToken)}`
      const pending = await documentStore.getDocument<{
        uid?: string
        oauthTokenSecret?: string
        createdAt?: string
        returnTo?: string
      }>(pendingPath)

      if (!pending?.uid || !pending.oauthTokenSecret) {
        logger.warn('Discogs OAuth callback: no pending session')
        failRedirect('session_expired')
        return
      }

      validatedReturnTo = validateReturnTo(pending.returnTo)

      const created = pending.createdAt ? Date.parse(pending.createdAt) : NaN
      if (!Number.isFinite(created) || Date.now() - created > PENDING_TTL_MS) {
        if (documentStore.deleteDocument) {
          try {
            await documentStore.deleteDocument(pendingPath)
          } catch {
            /* ignore */
          }
        }
        failRedirect('session_expired')
        return
      }

      const uid = pending.uid
      const oauthCfg = getDiscogsOAuthConfig()
      if (!oauthCfg.consumerKey || !oauthCfg.consumerSecret) {
        failRedirect('server_misconfigured')
        return
      }

      let encryptionReady = true
      try {
        const { getIntegrationTokenMasterKeyBytes } = await import('../config/backend-config.js')
        getIntegrationTokenMasterKeyBytes()
      } catch {
        encryptionReady = false
      }
      if (!encryptionReady) {
        failRedirect('encryption_unconfigured')
        return
      }

      try {
        const access = await discogsGetAccessToken({
          consumerKey: oauthCfg.consumerKey,
          consumerSecret: oauthCfg.consumerSecret,
          oauthToken,
          oauthTokenSecret: pending.oauthTokenSecret,
          oauthVerifier,
        })

        const { username } = await discogsGetIdentity({
          consumerKey: oauthCfg.consumerKey,
          consumerSecret: oauthCfg.consumerSecret,
          oauthToken: access.oauthToken,
          oauthTokenSecret: access.oauthTokenSecret,
        })

        const credPayload: DiscogsOAuthCredentialPayload = {
          oauthToken: access.oauthToken,
          oauthTokenSecret: access.oauthTokenSecret,
        }
        const envelope = encryptJsonEnvelope(uid, credPayload)

        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${DISCOGS_INTEGRATION_ID}`
        await documentStore.setDocument(integrationPath, {
          providerId: DISCOGS_INTEGRATION_ID,
          status: 'connected',
          discogsUsername: username,
          credentialEnvelope: envelope,
          oauthCompletedAt: toStoredDateTime(),
          updatedAt: toStoredDateTime(),
        })

        if (documentStore.deleteDocument) {
          await documentStore.deleteDocument(pendingPath)
        }

        logger.info('Discogs OAuth completed', { uid, username })

        const cfg = getDiscogsOAuthConfig()
        const successPath =
          validatedReturnTo != null
            ? withDiscogsOAuthFlash(validatedReturnTo, 'success')
            : cfg.appSuccessRedirect
        res.redirect(302, resolveDiscogsOAuthRedirectUrl(req, successPath))
      } catch (err) {
        logger.error('Discogs OAuth callback failed', { uid, error: err })
        failRedirect('token_exchange_failed')
      }
    }
  )

  expressApp.delete(
    '/api/oauth/discogs',
    rateLimit({
      ...discogsOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 20,
    }),
    authenticateUser,
    requireVerifiedEmail,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${DISCOGS_INTEGRATION_ID}`
      try {
        if (!documentStore.deleteDocument) {
          res.status(500).json({ ok: false, error: 'Delete not supported by store.' })
          return
        }
        const integration = await documentStore.getDocument<Record<string, unknown>>(integrationPath)
        const pendingTok =
          typeof integration?.[DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD] === 'string'
            ? integration[DISCOGS_OAUTH_PENDING_REQUEST_TOKEN_FIELD]
            : null
        if (pendingTok) {
          const pendingPath = `${OAUTH_DISCOGS_PENDING_COLLECTION}/${encodeURIComponent(pendingTok)}`
          try {
            await documentStore.deleteDocument(pendingPath)
          } catch {
            /* ignore */
          }
        }
        await documentStore.deleteDocument(integrationPath)
        res.status(200).json({ ok: true })
      } catch (err) {
        logger.error('Discogs disconnect failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not disconnect Discogs.' })
      }
    }
  )
}
