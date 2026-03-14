import { logger } from 'firebase-functions'

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then((dotenv) => dotenv.config())
}

import admin from 'firebase-admin'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { beforeUserCreated } from 'firebase-functions/v2/identity'
import { defineJsonSecret, defineString } from 'firebase-functions/params'
import { existsSync, readFileSync } from 'fs'

import { applyExportedConfigToEnv } from './config/exported-config.js'
import { FirestoreDocumentStore } from './adapters/storage/firestore-document-store.js'
import { getWidgetContent, validWidgetIds } from './widgets/get-widget-content.js'
import createUserJob from './jobs/create-user.js'
import deleteUserJob from './jobs/delete-user.js'
import syncDiscogsDataJob from './jobs/sync-discogs-data.js'
import syncGoodreadsDataJob from './jobs/sync-goodreads-data.js'
import syncInstagramDataJob from './jobs/sync-instagram-data.js'
import syncSpotifyDataJob from './jobs/sync-spotify-data.js'
import syncSteamDataJob from './jobs/sync-steam-data.js'
import syncFlickrDataJob from './jobs/sync-flickr-data.js'
import { rateLimit } from 'express-rate-limit'

const rateLimitMessage = { ok: false, error: 'Too many requests. Please try again later.' }

function createRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    limit: max,
    message: rateLimitMessage,
    standardHeaders: true,
    legacyHeaders: false,
  })
}

// Define parameters for v2
const storageFirestoreDatabaseUrl = defineString(
  'STORAGE_FIRESTORE_DATABASE_URL'
)

// Exported runtime config (firebase functions:config:export) – applied to process.env on first use
const functionsConfigExport = defineJsonSecret('FUNCTIONS_CONFIG_EXPORT')

function getAdminCredential(): admin.credential.Credential {
  if (process.env.NODE_ENV === 'production') {
    return admin.credential.applicationDefault()
  }
  const tokenPath = './token.json'
  if (existsSync(tokenPath)) {
    return admin.credential.cert(JSON.parse(readFileSync(tokenPath, 'utf8')) as admin.ServiceAccount)
  }
  return admin.credential.applicationDefault()
}

async function ensureExportedConfigApplied(): Promise<void> {
  if (process.env.__FUNCTIONS_CONFIG_APPLIED__) return
  try {
    const data = functionsConfigExport.value()
    applyExportedConfigToEnv(data as Record<string, string>)
    process.env.__FUNCTIONS_CONFIG_APPLIED__ = '1'
  } catch (err) {
    logger.warn('Could not load FUNCTIONS_CONFIG_EXPORT (e.g. local dev with .env)', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

// Initialize Firebase Admin (production: ADC; local: token.json if present)
const adminConfig: admin.AppOptions = {
  credential: getAdminCredential(),
  databaseURL: storageFirestoreDatabaseUrl as unknown as string,
  projectId: 'personal-stats-chrisvogt',
}

admin.initializeApp(adminConfig)

// Connect to emulators in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    (admin.auth() as unknown as { useEmulator(url: string): void }).useEmulator('http://127.0.0.1:9099')
    console.log('Connected to Firebase Auth emulator')
  } catch {
    console.log('Firebase Auth emulator already connected or not available')
  }

  try {
    (admin.firestore() as unknown as { useEmulator(host: string, port: number): void }).useEmulator('127.0.0.1', 8080)
    console.log('Connected to Firestore emulator')
  } catch {
    console.log('Firestore emulator already connected or not available')
  }
}

admin.firestore().settings({
  ignoreUndefinedProperties: true,
})

const documentStore = new FirestoreDocumentStore()

const scheduleOpts = {
  schedule: 'every day 02:00',
  region: 'us-central1',
  secrets: [functionsConfigExport],
}

export const syncGoodreadsData = onSchedule(scheduleOpts, async () => {
  await ensureExportedConfigApplied()
  await syncGoodreadsDataJob()
})

export const syncSpotifyData = onSchedule(scheduleOpts, async () => {
  await ensureExportedConfigApplied()
  await syncSpotifyDataJob()
})

export const syncSteamData = onSchedule(scheduleOpts, async () => {
  await ensureExportedConfigApplied()
  await syncSteamDataJob()
})

export const syncInstagramData = onSchedule(scheduleOpts, async () => {
  await ensureExportedConfigApplied()
  await syncInstagramDataJob()
})

export const syncFlickrData = onSchedule(scheduleOpts, async () => {
  await ensureExportedConfigApplied()
  await syncFlickrDataJob(documentStore)
})

export const handleUserCreation = beforeUserCreated(
  { secrets: [functionsConfigExport] },
  async (event) => {
    await ensureExportedConfigApplied()
    const user = event.data
    if (!user) {
      logger.error('handleUserCreation: event.data missing')
      return
    }
    const result = await createUserJob(user)
    if (result.result !== 'SUCCESS') {
      logger.error('User creation trigger failed', { uid: user.uid, error: result.error })
    } else {
      logger.info('User creation trigger completed successfully', { uid: user.uid })
    }
  }
)

const buildSuccessResponse = (payload: unknown): { ok: true; payload: unknown } => ({
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
function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false
  if (process.env.NODE_ENV !== 'production') return true
  return ALLOWED_EMAIL_DOMAINS.some((domain) => email.endsWith(domain))
}

// Authentication middleware
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
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true)

        logger.info('Session cookie verified successfully', {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          emailVerified: decodedClaims.email_verified,
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
          emailVerified: decodedClaims.email_verified,
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    const token = authHeader.split('Bearer ')[1]

    try {
      const decodedToken = await admin.auth().verifyIdToken(token!)

      logger.info('JWT token verified successfully', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
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
        emailVerified: decodedToken.email_verified,
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

const expressApp = express()

expressApp.use(compression())
expressApp.use(cookieParser())

const corsAllowList: RegExp[] = [
  /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
  /^https?:\/\/([a-z0-9-]+--)?chrisvogt\.netlify\.app$/,
  /https?:\/\/([a-z0-9]+[.])*chronogrove[.]com$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chronogrove[.]com$/,
]

if (process.env.NODE_ENV !== 'production') {
  corsAllowList.push(/localhost:?(\d+)?$/)
}

const corsOptions = {
  origin: corsAllowList,
  credentials: true,
}

const syncHandlersByProvider: Record<string, () => Promise<unknown>> = {
  discogs: syncDiscogsDataJob,
  goodreads: syncGoodreadsDataJob,
  instagram: syncInstagramDataJob,
  spotify: syncSpotifyDataJob,
  steam: syncSteamDataJob,
  flickr: () => syncFlickrDataJob(documentStore),
}

expressApp.get(
  '/api/widgets/sync/:provider',
  cors(corsOptions),
  createRateLimiter(15 * 60 * 1000, 10),
  async (req, res) => {
    const provider = req.params.provider as string
    const handler = provider ? syncHandlersByProvider[provider] : undefined

    if (!handler) {
      logger.log(`Attempted to sync an unrecognized provider: ${provider}`)
      res.status(400).send('Unrecognized or unsupported provider.')
      return
    }

    try {
      const result = await handler()
      res.status(200).send(result)
    } catch (err) {
      logger.error(`Error syncing ${provider} data.`, err)
      res.status(500).send({ error: err })
    }
  }
)

expressApp.get('/api/widgets/:provider', cors(corsOptions), async (req, res) => {
  const provider = req.params.provider

  if (!provider || !validWidgetIds.includes(provider)) {
    const response = buildFailureResponse({
      message: 'A valid provider type is required.',
    })
    res.status(404).send(response)
    res.end()
    return
  }

  const originalHostname = (req.headers['x-forwarded-host'] as string) || req.hostname
  const userId = originalHostname === 'api.chronogrove.com' ? 'chronogrove' : 'chrisvogt'

  try {
    const widgetContent = await getWidgetContent(provider, userId)
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
      const userRecord = await admin.auth().getUser(req.user.uid)
      const response = buildSuccessResponse({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      })
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
      const result = await deleteUserJob({ uid })
      if (result.result !== 'SUCCESS') {
        logger.warn('Delete-account: Firestore cleanup failed (doc may be missing)', {
          uid,
          error: result.error,
        })
      }
      await admin.auth().deleteUser(uid)
      logger.info('User account deleted', { uid })
      res.status(200).send(buildSuccessResponse({ message: 'Account deleted' }))
    } catch (err) {
      logger.error('Error deleting account', { uid, error: err })
      res.status(500).send(buildFailureResponse(err))
    }
  }
)

/** Returns session auth error message or null if header is valid. Exported for tests. */
export function getSessionAuthError(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'No valid authorization token provided'
  }
  const token = authHeader.split('Bearer ')[1]?.trim() || ''
  if (!token) return 'No token'
  return null
}

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

      const token = (req.headers.authorization as string).split('Bearer ')[1]!.trim()
      const decodedToken = await admin.auth().verifyIdToken(token)

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
      const sessionCookie = await admin.auth().createSessionCookie(token, { expiresIn })

      const options = {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
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

expressApp.get('/api/firebase-config', cors(corsOptions), (_req, res) => {
  const config = {
    apiKey: process.env.CLIENT_API_KEY,
    authDomain: process.env.CLIENT_AUTH_DOMAIN,
    projectId: process.env.CLIENT_PROJECT_ID,
  }
  res.json(config)
})

expressApp.post(
  '/api/auth/logout',
  cors(corsOptions),
  createRateLimiter(15 * 60 * 1000, 30),
  authenticateUser,
  async (req, res) => {
    if (!req.user) return
    try {
      await admin.auth().revokeRefreshTokens(req.user.uid)
      res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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

expressApp.get('/{*splat}', (_req, res) => {
  res.sendStatus(404)
  res.end()
})

export const app = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    secrets: [functionsConfigExport],
  },
  async (req, res) => {
    await ensureExportedConfigApplied()
    expressApp(req, res)
  }
)
