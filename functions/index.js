const admin = require('firebase-admin')
const cors = require('cors')
const express = require('express')
const functions = require('firebase-functions')
const { logger } = require('firebase-functions')

const {
  getWidgetContent,
  validWidgetIds
} = require('./lib/get-widget-content')
const syncGoodreadsData = require('./jobs/sync-goodreads-data')
const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyData = require('./jobs/sync-spotify-data')
const syncSteamData = require('./jobs/sync-steam-data')

const firebaseServiceAccountToken = require('./token.json')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com',
})

admin.firestore().settings({
  // Firestore throws when saving documents containing null values and the
  // Goodreads response object contains null values for unset fields. The
  // Firestore `ignoreUndefinedProperties` option enables support for fields
  // with null values.
  ignoreUndefinedProperties: true,
})

exports.syncGoodreadsData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncGoodreadsData())

exports.syncSpotifyData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncSpotifyData())

exports.syncSteamData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncSteamData())

exports.syncInstagramData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncInstagramData())

const buildSuccessResponse = (payload) => ({
  ok: true,
  payload,
})

const buildFailureResponse = (err = {}) => ({
  ok: false,
  error: err.message || err,
})

const app = express()

const corsAllowList = [
  /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
  /\.netlify\.app$/
]

const corsOptions = {
  origin: corsAllowList
}

const syncHandlersByProvider = {
  goodreads: syncGoodreadsData,
  instagram: syncInstagramData,
  spotify: syncSpotifyData,
  steam: syncSteamData
}

app.get(
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
      logger.error('Error syncing data manually.', err)
      res.status(500).send({ error: err })
    }
  }
)

app.get(
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

    try {
      const widgetContent = await getWidgetContent(provider)
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

app.get('*', (req, res) => {
  res.sendStatus(404)
  return res.end()
})

exports.app = functions.https.onRequest(app)
