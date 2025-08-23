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
import { defineString } from 'firebase-functions/params'
import { readFileSync } from 'fs'

// Import v1 functions for auth triggers
import { auth } from 'firebase-functions/v1'

import { getWidgetContent, validWidgetIds } from './lib/get-widget-content.js'
import createUserJob from './jobs/create-user.js'
import deleteUserJob from './jobs/delete-user.js'
import syncDiscogsDataJob from './jobs/sync-discogs-data.js'
import syncGoodreadsDataJob from './jobs/sync-goodreads-data.js'
import syncInstagramDataJob from './jobs/sync-instagram-data.js'
import syncSpotifyDataJob from './jobs/sync-spotify-data.js'
import syncSteamDataJob from './jobs/sync-steam-data.js'
import syncFlickrDataJob from './jobs/sync-flickr-data.js'
import rateLimiter from './middleware/rate-limiter.js'

const firebaseServiceAccountToken = JSON.parse(
  readFileSync('./token.json', 'utf8')
)

// Define parameters for v2
const storageFirestoreDatabaseUrl = defineString(
  'STORAGE_FIRESTORE_DATABASE_URL'
)

// Initialize Firebase Admin
const adminConfig = {
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: storageFirestoreDatabaseUrl,
  projectId: 'personal-stats-chrisvogt'
}

admin.initializeApp(adminConfig)

// Connect to emulators in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    admin.auth().useEmulator('http://127.0.0.1:9099')
    console.log('Connected to Firebase Auth emulator')
  } catch {
    console.log('Firebase Auth emulator already connected or not available')
  }
  
  try {
    admin.firestore().useEmulator('127.0.0.1', 8080)
    console.log('Connected to Firestore emulator')
  } catch {
    console.log('Firestore emulator already connected or not available')
  }
}

admin.firestore().settings({
  // Firestore throws when saving documents containing null values and the
  // Goodreads response object contains null values for unset fields. The
  // Firestore `ignoreUndefinedProperties` option enables support for fields
  // with null values.
  ignoreUndefinedProperties: true,
})

export const syncGoodreadsData = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'us-central1',
  },
  () => syncGoodreadsDataJob()
)

export const syncSpotifyData = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'us-central1',
  },
  () => syncSpotifyDataJob()
)

export const syncSteamData = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'us-central1',
  },
  () => syncSteamDataJob()
)

export const syncInstagramData = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'us-central1',
  },
  () => syncInstagramDataJob()
)

export const syncFlickrData = onSchedule(
  {
    schedule: 'every day 02:00',
    region: 'us-central1',
  },
  () => syncFlickrDataJob()
)

export const handleUserCreation = auth.user().onCreate(async (user) => {
  // Create user record in Firestore
  const result = await createUserJob(user)

  if (result.result === 'SUCCESS') {
    logger.info('User creation trigger completed successfully', {
      uid: user.uid,
    })
  } else {
    logger.error('User creation trigger failed', {
      uid: user.uid,
      error: result.error,
    })
  }
})

export const handleUserDeletion = auth.user().onDelete(async (user) => {
  // Delete user record from Firestore
  const result = await deleteUserJob(user)

  if (result.result === 'SUCCESS') {
    logger.info('User deletion trigger completed successfully', {
      uid: user.uid,
    })
  } else {
    logger.error('User deletion trigger failed', {
      uid: user.uid,
      error: result.error,
    })
  }
})

const buildSuccessResponse = (payload) => ({
  ok: true,
  payload,
})

const buildFailureResponse = (err = {}) => ({
  ok: false,
  error: err.message || err,
})

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    // First try to authenticate with session cookie
    const sessionCookie = req.cookies?.session
    if (sessionCookie) {
      logger.info('Session cookie found, attempting verification', {
        cookieLength: sessionCookie.length,
        cookieStart: sessionCookie.substring(0, 50),
        cookieEnd: sessionCookie.substring(sessionCookie.length - 50)
      })
      
      try {
        const decodedClaims = await admin
          .auth()
          .verifySessionCookie(sessionCookie, true)

        logger.info('Session cookie verified successfully', {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          emailVerified: decodedClaims.email_verified
        })

        // Check if user's email domain matches chrisvogt.me or chronogrove.com
        if (
          !decodedClaims.email ||
          (!decodedClaims.email.endsWith('@chrisvogt.me') && 
           !decodedClaims.email.endsWith('@chronogrove.com'))
        ) {
          logger.warn('Email domain rejected', {
            email: decodedClaims.email,
            uid: decodedClaims.uid
          })
          return res.status(403).json({
            ok: false,
            error: 'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
          })
        }

        logger.info('User authenticated successfully via session cookie', {
          uid: decodedClaims.uid,
          email: decodedClaims.email
        })

        // Only pass minimal user data to the request
        req.user = {
          uid: decodedClaims.uid,
          email: decodedClaims.email,
          emailVerified: decodedClaims.email_verified
        }
        return next()
      } catch (error) {
        // Session cookie is invalid, try JWT token
        logger.error('Session cookie verification failed', {
          error: error.message,
          code: error.code,
          stack: error.stack
        })
      }
    }

    // Fallback to JWT token authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No valid authorization header found', {
        hasAuthHeader: !!req.headers.authorization,
        authHeaderStart: req.headers.authorization?.substring(0, 20)
      })
      return res.status(401).json({
        ok: false,
        error: 'No valid authorization header found',
      })
    }

    logger.info('JWT token found, attempting verification')
    const token = authHeader.split('Bearer ')[1]
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token)
      
      logger.info('JWT token verified successfully', {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      })

      // Check if user's email domain matches chrisvogt.me
      if (!decodedToken.email || !decodedToken.email.endsWith('@chrisvogt.me')) {
        logger.warn('JWT email domain rejected', {
          email: decodedToken.email,
          uid: decodedToken.uid
        })
        return res.status(403).json({
          ok: false,
          error: 'Access denied. Only chrisvogt.me domain users are allowed.',
        })
      }

      logger.info('User authenticated successfully via JWT token', {
        uid: decodedToken.uid,
        email: decodedToken.email
      })

      // Only pass minimal user data to the request
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      }
      next()
    } catch (error) {
      // Log minimal info for security
      logger.error('JWT token verification failed', {
        error: error.message,
        code: error.code
      })
      return res.status(401).json({
        ok: false,
        error: 'Invalid or expired JWT token',
      })
    }
  } catch (error) {
    // Log minimal info for security
    logger.error('Authentication error:', {
      error: error.message,
      code: error.code,
      uid: req.user?.uid || 'unknown'
    })
    return res.status(401).json({
      ok: false,
      error: 'Invalid or expired token',
    })
  }
}

const expressApp = express()

// Enable compression middleware
expressApp.use(compression())

// Enable cookie parsing middleware
expressApp.use(cookieParser())

const corsAllowList = [
  /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
  /^https?:\/\/([a-z0-9-]+--)?chrisvogt\.netlify\.app$/,
  /https?:\/\/([a-z0-9]+[.])*chronogrove[.]com$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chronogrove[.]com$/,
  /^https?:\/\/8ms\.4a9\.mytemp\.website$/,
]

// Add localhost only in development
if (process.env.NODE_ENV !== 'production') {
  corsAllowList.push(/localhost:?(\d+)?$/)
}

const corsOptions = {
  origin: corsAllowList,
  credentials: true, // Required for cookies to be sent with cross-origin requests
}

const syncHandlersByProvider = {
  discogs: syncDiscogsDataJob,
  goodreads: syncGoodreadsDataJob,
  instagram: syncInstagramDataJob,
  spotify: syncSpotifyDataJob,
  steam: syncSteamDataJob,
  flickr: syncFlickrDataJob,
}

// Protected sync endpoint - requires authentication
expressApp.get(
  '/api/widgets/sync/:provider',
  cors(corsOptions),
  rateLimiter(15 * 60 * 1000, 10), // 10 requests per 15 minutes for sync
  authenticateUser,
  async (req, res) => {
    const provider = req.params.provider
    const handler = syncHandlersByProvider[provider]

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

// Public widget endpoint - no authentication required
expressApp.get(
  '/api/widgets/:provider',
  cors(corsOptions),
  async (req, res) => {
    const provider = req.params.provider

    if (!provider || !validWidgetIds.includes(provider)) {
      const response = buildFailureResponse({
        message: 'A valid provider type is required.',
      })
      res.status(404).send(response)
      return res.end()
    }

    // Determine userId based on hostname — this is a temporary solution to allow
    // the widget to be used on the Chronogrove website.
    // Uses x-forwarded-host for Firebase Hosting + Cloud Functions setup
    const originalHostname = req.headers['x-forwarded-host'] || req.hostname
    const userId =
      originalHostname === 'api.chronogrove.com' ? 'chronogrove' : 'chrisvogt'

    try {
      const widgetContent = await getWidgetContent(provider, userId)
      const response = buildSuccessResponse(widgetContent)
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')
      res.status(200).send(response)
    } catch (err) {
      const response = buildFailureResponse(err)
      res.status(400).send(response)
    }

    return res.end()
  }
)

// New protected user info endpoint
expressApp.get(
  '/api/user/profile',
  cors(corsOptions),
  rateLimiter(15 * 60 * 1000, 50), // 50 requests per 15 minutes for profile
  authenticateUser,
  async (req, res) => {
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
      const response = buildFailureResponse(err)
      res.status(500).send(response)
    }
  }
)

// Session cookie endpoint - creates a secure session cookie from JWT token
expressApp.post('/api/auth/session', cors(corsOptions), async (req, res) => {
  try {
    // Get the JWT token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'No valid authorization token provided',
      })
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the token first
    const decodedToken = await admin.auth().verifyIdToken(token)

    // Check if user's email domain matches chrisvogt.me or chronogrove.com
    if (!decodedToken.email || 
        (!decodedToken.email.endsWith('@chrisvogt.me') && 
         !decodedToken.email.endsWith('@chronogrove.com'))) {
      return res.status(403).json({
        ok: false,
        error: 'Access denied. Only chrisvogt.me or chronogrove.com domain users are allowed.',
      })
    }

    // Log minimal info for security
    logger.info('Creating session cookie for user', {
      uid: decodedToken.uid,
      email: decodedToken.email
    })

    // Create a Firebase session cookie that expires in 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days in milliseconds
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(token, { expiresIn })

    // Set the session cookie with secure settings
    const options = {
      maxAge: expiresIn,
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection
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
})

// Firebase config endpoint - serves configuration dynamically
expressApp.get('/api/firebase-config', cors(corsOptions), (req, res) => {
  // Build config from Firebase Admin SDK and environment variables
  const config = {
    apiKey: process.env.CLIENT_API_KEY,
    authDomain: process.env.CLIENT_AUTH_DOMAIN,
    projectId: process.env.CLIENT_PROJECT_ID
  }
  
  res.json(config)
})

// New logout endpoint (optional - for server-side logout if needed)
expressApp.post(
  '/api/auth/logout',
  cors(corsOptions),
  authenticateUser,
  async (req, res) => {
    try {
      // Revoke refresh tokens for the user
      await admin.auth().revokeRefreshTokens(req.user.uid)

      // Clear the session cookie
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

expressApp.get('*', (req, res) => {
  res.sendStatus(404)
  return res.end()
})

export const app = onRequest(
  {
    region: 'us-central1',
  },
  expressApp
)
