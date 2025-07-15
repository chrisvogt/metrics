import { logger } from 'firebase-functions'

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then(dotenv => dotenv.config())
}

import admin from 'firebase-admin'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineString } from 'firebase-functions/params'
import { readFileSync } from 'fs'

import {
  getWidgetContent,
  validWidgetIds
} from './lib/get-widget-content.js'
import syncGoodreadsDataJob from './jobs/sync-goodreads-data.js'
import syncInstagramDataJob from './jobs/sync-instagram-data.js'
import syncSpotifyDataJob from './jobs/sync-spotify-data.js'
import syncSteamDataJob from './jobs/sync-steam-data.js'
import syncFlickrDataJob from './jobs/sync-flickr-data.js'

const firebaseServiceAccountToken = JSON.parse(readFileSync('./token.json', 'utf8'))

// Define parameters for v2
const storageFirestoreDatabaseUrl = defineString('STORAGE_FIRESTORE_DATABASE_URL')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: storageFirestoreDatabaseUrl.value(),
})

admin.firestore().settings({
  // Firestore throws when saving documents containing null values and the
  // Goodreads response object contains null values for unset fields. The
  // Firestore `ignoreUndefinedProperties` option enables support for fields
  // with null values.
  ignoreUndefinedProperties: true,
})

export const syncGoodreadsData = onSchedule({
  schedule: 'every day 02:00',
  region: 'us-central1'
}, () => syncGoodreadsDataJob())

export const syncSpotifyData = onSchedule({
  schedule: 'every day 02:00',
  region: 'us-central1'
}, () => syncSpotifyDataJob())

export const syncSteamData = onSchedule({
  schedule: 'every day 02:00',
  region: 'us-central1'
}, () => syncSteamDataJob())

export const syncInstagramData = onSchedule({
  schedule: 'every day 02:00',
  region: 'us-central1'
}, () => syncInstagramDataJob())

export const syncFlickrData = onSchedule({
  schedule: 'every day 02:00',
  region: 'us-central1'
}, () => syncFlickrDataJob())

const buildSuccessResponse = (payload) => ({
  ok: true,
  payload,
})

const buildFailureResponse = (err = {}) => ({
  ok: false,
  error: err.message || err,
})

const expressApp = express()

// Enable compression middleware
expressApp.use(compression())

const corsAllowList = [
  /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
  /\.netlify\.app$/,
  /https?:\/\/([a-z0-9]+[.])*chronogrove[.]com$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chronogrove[.]com$/,
  /localhost:?(\d+)?$/,
  /^https?:\/\/8ms\.4a9\.mytemp\.website$/,
]

const corsOptions = {
  origin: corsAllowList
}

const syncHandlersByProvider = {
  goodreads: syncGoodreadsDataJob,
  instagram: syncInstagramDataJob,
  spotify: syncSpotifyDataJob,
  steam: syncSteamDataJob,
  flickr: syncFlickrDataJob
}

expressApp.get(
  '/api/widgets/sync/:provider', 
  async (req, res) => {
    const provider = req.params.provider
    const handler = syncHandlersByProvider[provider]

    if (!handler) {
      logger.log(`Attempted to sync an unrecognized provider: ${provider}`)
      res.status(400).send('Unrecognized or unsupported provider.')
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
    const userId = originalHostname === 'api.chronogrove.com' ? 'chronogrove' : 'chrisvogt'

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

expressApp.get('*', (req, res) => {
  res.sendStatus(404)
  return res.end()
})

export const app = onRequest({
  region: 'us-central1'
}, expressApp)
