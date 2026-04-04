import type { DocumentStore } from '../ports/document-store.js'
import express from 'express'
import { randomBytes } from 'node:crypto'
import { rateLimit } from 'express-rate-limit'

import { getSteamOAuthConfig } from '../config/backend-config.js'
import {
  OAUTH_STEAM_PENDING_COLLECTION,
  USER_INTEGRATIONS_SEGMENT,
} from '../config/future-tenant-collections.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { toStoredDateTime } from '../utils/time.js'
import { encryptJsonEnvelope } from '../services/integration-token-crypto.js'
import {
  STEAM_INTEGRATION_ID,
  type SteamOAuthCredentialPayload,
} from '../services/steam-integration-credentials.js'
import { validateReturnTo, withSteamOAuthFlash } from '../services/oauth-return-path.js'
import { getRateLimitKey } from '../middleware/rate-limit-key.js'
import { getSteamIdFromAccessToken } from '../api/steam/get-token-details.js'

const PENDING_TTL_MS = 15 * 60 * 1000

const rateLimitMessage = { ok: false, error: 'Too many requests. Please try again later.' }

const steamOAuthRateLimitBase = {
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
} as const

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

export interface RegisterSteamOAuthOptions {
  expressApp: express.Express
  authenticateUser: express.RequestHandler
  documentStore: DocumentStore
  logger: LoggerLike
  isProductionEnvironment: boolean
  allowedEmailDomains: string[]
}

export function registerSteamOAuthRoutes(opts: RegisterSteamOAuthOptions): void {
  const {
    expressApp,
    authenticateUser,
    documentStore,
    logger,
    isProductionEnvironment,
    allowedEmailDomains,
  } = opts

  const usersPath = getUsersCollectionPath()

  expressApp.post(
    '/api/oauth/steam/start',
    rateLimit({
      ...steamOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 30,
    }),
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

      const oauthCfg = getSteamOAuthConfig()
      if (!oauthCfg.clientId || !oauthCfg.browserRedirectUrl) {
        res.status(503).json({
          ok: false,
          error: 'Steam OAuth is not configured on the server.',
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
        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${STEAM_INTEGRATION_ID}`
        const existing = await documentStore.getDocument<Record<string, unknown>>(integrationPath)
        if (existing?.status === 'connected') {
          res.status(400).json({ ok: false, error: 'Steam is already linked for this account.' })
          return
        }

        const state = randomBytes(24).toString('hex')
        const pendingPath = `${OAUTH_STEAM_PENDING_COLLECTION}/${state}`
        await documentStore.setDocument(pendingPath, {
          uid,
          createdAt: toStoredDateTime(),
          ...(returnTo ? { returnTo } : {}),
        })

        await documentStore.setDocument(integrationPath, {
          providerId: STEAM_INTEGRATION_ID,
          status: 'pending_oauth',
          updatedAt: toStoredDateTime(),
        })

        const authorizeUrl = new URL('https://steamcommunity.com/oauth/login')
        authorizeUrl.searchParams.set('response_type', 'token')
        authorizeUrl.searchParams.set('client_id', oauthCfg.clientId)
        authorizeUrl.searchParams.set('state', state)
        authorizeUrl.searchParams.set('mobileminimal', '1')

        res.status(200).json({ ok: true, authorizeUrl: authorizeUrl.toString() })
      } catch (err) {
        logger.error('Steam OAuth start failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not start Steam authorization.' })
      }
    }
  )

  expressApp.post(
    '/api/oauth/steam/complete',
    rateLimit({
      ...steamOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 40,
    }),
    express.json({ limit: '8kb' }),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const body = req.body as { access_token?: unknown; state?: unknown }
      const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : ''
      const state = typeof body.state === 'string' ? body.state.trim() : ''

      const failJson = (error: string, redirectPath?: string) => {
        res.status(400).json({ ok: false, error, ...(redirectPath ? { redirectPath } : {}) })
      }

      if (!accessToken || !state) {
        failJson('missing_token_or_state')
        return
      }

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
      if (!encryptionReady) {
        res.status(503).json({ ok: false, error: 'Token encryption is not configured.' })
        return
      }

      const pendingPath = `${OAUTH_STEAM_PENDING_COLLECTION}/${state}`
      const pending = await documentStore.getDocument<{
        uid?: string
        createdAt?: string
        returnTo?: string
      }>(pendingPath)

      if (!pending?.uid || pending.uid !== uid) {
        logger.warn('Steam OAuth complete: invalid or stale state')
        failJson('session_expired')
        return
      }

      const created = pending.createdAt ? Date.parse(pending.createdAt) : NaN
      if (!Number.isFinite(created) || Date.now() - created > PENDING_TTL_MS) {
        if (documentStore.deleteDocument) {
          try {
            await documentStore.deleteDocument(pendingPath)
          } catch {
            /* ignore */
          }
        }
        failJson('session_expired')
        return
      }

      const validatedReturnTo = validateReturnTo(pending.returnTo)

      try {
        const steamId = await getSteamIdFromAccessToken(accessToken)

        const credPayload: SteamOAuthCredentialPayload = { accessToken }
        const envelope = encryptJsonEnvelope(uid, credPayload)

        const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${STEAM_INTEGRATION_ID}`
        await documentStore.setDocument(integrationPath, {
          providerId: STEAM_INTEGRATION_ID,
          status: 'connected',
          steamId,
          credentialEnvelope: envelope,
          oauthCompletedAt: toStoredDateTime(),
          updatedAt: toStoredDateTime(),
        })

        if (documentStore.deleteDocument) {
          await documentStore.deleteDocument(pendingPath)
        }

        logger.info('Steam OAuth completed', { uid, steamId })

        const cfg = getSteamOAuthConfig()
        const successPath =
          validatedReturnTo != null
            ? withSteamOAuthFlash(validatedReturnTo, 'success')
            : cfg.appSuccessRedirect

        res.status(200).json({
          ok: true,
          redirectPath: successPath,
        })
      } catch (err) {
        logger.error('Steam OAuth complete failed', { uid, error: err })
        const errPath =
          validatedReturnTo != null
            ? withSteamOAuthFlash(validatedReturnTo, 'error', 'token_exchange_failed')
            : withSteamOAuthFlash('/onboarding', 'error', 'token_exchange_failed')
        res.status(400).json({
          ok: false,
          error: 'token_exchange_failed',
          redirectPath: errPath,
        })
      }
    }
  )

  expressApp.delete(
    '/api/oauth/steam',
    rateLimit({
      ...steamOAuthRateLimitBase,
      windowMs: 15 * 60 * 1000,
      limit: 20,
    }),
    authenticateUser,
    async (req, res) => {
      if (!req.user) return
      const uid = req.user.uid
      const integrationPath = `${usersPath}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${STEAM_INTEGRATION_ID}`
      try {
        if (!documentStore.deleteDocument) {
          res.status(500).json({ ok: false, error: 'Delete not supported by store.' })
          return
        }
        await documentStore.deleteDocument(integrationPath)
        res.status(200).json({ ok: true })
      } catch (err) {
        logger.error('Steam disconnect failed', { uid, error: err })
        res.status(500).json({ ok: false, error: 'Could not disconnect Steam.' })
      }
    }
  )
}
