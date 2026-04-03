import type { DocumentStore } from '../ports/document-store.js'
import express from 'express'

import { getFlickrOAuthConfig } from '../config/backend-config.js'
import {
  OAUTH_FLICKR_PENDING_COLLECTION,
  USER_INTEGRATIONS_SEGMENT,
} from '../config/future-tenant-collections.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { toStoredDateTime } from '../utils/time.js'
import { encryptJsonEnvelope } from '../services/integration-token-crypto.js'
import {
  buildFlickrAuthorizeUrl,
  flickrGetAccessToken,
  flickrGetRequestToken,
} from '../services/flickr-oauth1a.js'
import {
  FLICKR_INTEGRATION_ID,
  type FlickrOAuthCredentialPayload,
} from '../services/flickr-integration-credentials.js'
import { validateReturnTo, withFlickrOAuthFlash } from '../services/oauth-return-path.js'

const PENDING_TTL_MS = 15 * 60 * 1000

/** OAuth 1.0a request token while status is \`pending_oauth\` (pending Firestore doc id). */
const FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD = 'oauthPendingRequestToken'

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

function resolvePublicOrigin(req: express.Request): string {
  const explicit = process.env.PUBLIC_APP_ORIGIN?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost'
  const proto =
    (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
    (req.protocol === 'http' ? 'http' : 'https')
  return `${proto}://${host}`
}

function resolveRedirectUrl(req: express.Request, target: string): string {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target
  }
  const base = resolvePublicOrigin(req)
  const path = target.startsWith('/') ? target : `/${target}`
  return `${base}${path}`
}

export interface RegisterFlickrOAuthOptions {
  expressApp: express.Express
  authenticateUser: express.RequestHandler
  documentStore: DocumentStore
  logger: LoggerLike
  isProductionEnvironment: boolean
  allowedEmailDomains: string[]
  createRateLimiter: (windowMs: number, max: number) => express.RequestHandler
}

export function registerFlickrOAuthRoutes(opts: RegisterFlickrOAuthOptions): void {
  const {
    expressApp,
    authenticateUser,
    documentStore,
    logger,
    isProductionEnvironment,
    allowedEmailDomains,
    createRateLimiter,
  } = opts

  const usersPath = getUsersCollectionPath()

  expressApp.post(
    '/api/oauth/flickr/start',
    createRateLimiter(15 * 60 * 1000, 30),
    express.json({ limit: '4kb' }),
    authenticateUser,
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

      const oauthCfg = getFlickrOAuthConfig()
      if (!oauthCfg.consumerKey || !oauthCfg.consumerSecret || !oauthCfg.callbackUrl) {
        res.status(503).json({
          ok: false,
          error: 'Flickr OAuth is not configured on the server.',
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
        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${FLICKR_INTEGRATION_ID}`
        const existing = await documentStore.getDocument<Record<string, unknown>>(integrationPath)
        if (existing?.status === 'connected') {
          res.status(400).json({ ok: false, error: 'Flickr is already linked for this account.' })
          return
        }

        const priorPending =
          typeof existing?.[FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD] === 'string'
            ? existing[FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD]
            : null
        if (priorPending && documentStore.deleteDocument) {
          const stalePendingPath = `${OAUTH_FLICKR_PENDING_COLLECTION}/${encodeURIComponent(priorPending)}`
          try {
            await documentStore.deleteDocument(stalePendingPath)
          } catch {
            /* ignore */
          }
        }

        const { oauthToken, oauthTokenSecret } = await flickrGetRequestToken({
          consumerKey: oauthCfg.consumerKey,
          consumerSecret: oauthCfg.consumerSecret,
          oauthCallback: oauthCfg.callbackUrl,
        })

        const pendingPath = `${OAUTH_FLICKR_PENDING_COLLECTION}/${encodeURIComponent(oauthToken)}`
        await documentStore.setDocument(pendingPath, {
          uid,
          oauthTokenSecret,
          createdAt: toStoredDateTime(),
          ...(returnTo ? { returnTo } : {}),
        })

        await documentStore.setDocument(integrationPath, {
          providerId: FLICKR_INTEGRATION_ID,
          status: 'pending_oauth',
          [FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD]: oauthToken,
          updatedAt: toStoredDateTime(),
        })

        const authorizeUrl = buildFlickrAuthorizeUrl(oauthToken, 'read')
        res.status(200).json({ ok: true, authorizeUrl })
      } catch (err) {
        logger.error('Flickr OAuth start failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not start Flickr authorization.' })
      }
    }
  )

  expressApp.get(
    '/api/oauth/flickr/callback',
    createRateLimiter(15 * 60 * 1000, 60),
    async (req, res) => {
      const oauthToken = typeof req.query.oauth_token === 'string' ? req.query.oauth_token : ''
      const oauthVerifier =
        typeof req.query.oauth_verifier === 'string' ? req.query.oauth_verifier : ''

      let validatedReturnTo: string | null = null

      const failRedirect = (reason: string) => {
        const path = validatedReturnTo
          ? withFlickrOAuthFlash(validatedReturnTo, 'error', reason)
          : withFlickrOAuthFlash('/onboarding', 'error', reason)
        res.redirect(302, resolveRedirectUrl(req, path))
      }

      if (!oauthToken || !oauthVerifier) {
        logger.warn('Flickr OAuth callback missing token or verifier')
        failRedirect('missing_token')
        return
      }

      const pendingPath = `${OAUTH_FLICKR_PENDING_COLLECTION}/${encodeURIComponent(oauthToken)}`
      const pending = await documentStore.getDocument<{
        uid?: string
        oauthTokenSecret?: string
        createdAt?: string
        returnTo?: string
      }>(pendingPath)

      if (!pending?.uid || !pending.oauthTokenSecret) {
        logger.warn('Flickr OAuth callback: no pending session', { oauthToken: oauthToken.slice(0, 8) })
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
      const oauthCfg = getFlickrOAuthConfig()
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
        const access = await flickrGetAccessToken({
          consumerKey: oauthCfg.consumerKey,
          consumerSecret: oauthCfg.consumerSecret,
          oauthToken,
          oauthTokenSecret: pending.oauthTokenSecret,
          oauthVerifier,
        })

        const credPayload: FlickrOAuthCredentialPayload = {
          oauthToken: access.oauthToken,
          oauthTokenSecret: access.oauthTokenSecret,
        }
        const envelope = encryptJsonEnvelope(uid, credPayload)

        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${FLICKR_INTEGRATION_ID}`
        await documentStore.setDocument(integrationPath, {
          providerId: FLICKR_INTEGRATION_ID,
          status: 'connected',
          flickrUserNsid: access.userNsid,
          flickrUsername: access.username || null,
          credentialEnvelope: envelope,
          oauthCompletedAt: toStoredDateTime(),
          updatedAt: toStoredDateTime(),
        })

        if (documentStore.deleteDocument) {
          await documentStore.deleteDocument(pendingPath)
        }

        logger.info('Flickr OAuth completed', { uid, nsid: access.userNsid })

        const cfg = getFlickrOAuthConfig()
        const successPath =
          validatedReturnTo != null
            ? withFlickrOAuthFlash(validatedReturnTo, 'success')
            : cfg.appSuccessRedirect
        res.redirect(302, resolveRedirectUrl(req, successPath))
      } catch (err) {
        logger.error('Flickr OAuth callback failed', { uid, error: err })
        failRedirect('token_exchange_failed')
      }
    }
  )

  /**
   * Removes stored credentials and any in-flight OAuth pending row.
   * Flickr does not offer a standard token-revocation call for these OAuth 1.0a tokens; users can
   * remove app access from their Flickr account settings if needed.
   */
  expressApp.delete(
    '/api/oauth/flickr',
    createRateLimiter(15 * 60 * 1000, 20),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${FLICKR_INTEGRATION_ID}`
      try {
        if (!documentStore.deleteDocument) {
          res.status(500).json({ ok: false, error: 'Delete not supported by store.' })
          return
        }
        const integration = await documentStore.getDocument<Record<string, unknown>>(integrationPath)
        const pendingTok =
          typeof integration?.[FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD] === 'string'
            ? integration[FLICKR_OAUTH_PENDING_REQUEST_TOKEN_FIELD]
            : null
        if (pendingTok) {
          const pendingPath = `${OAUTH_FLICKR_PENDING_COLLECTION}/${encodeURIComponent(pendingTok)}`
          try {
            await documentStore.deleteDocument(pendingPath)
          } catch {
            /* ignore */
          }
        }
        await documentStore.deleteDocument(integrationPath)
        res.status(200).json({ ok: true })
      } catch (err) {
        logger.error('Flickr disconnect failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not disconnect Flickr.' })
      }
    }
  )
}
