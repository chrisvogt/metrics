const admin = require('firebase-admin')
const cors = require('cors')
const express = require('express')
const functions = require('firebase-functions')

const { getWidgetContent, validWidgetIds } = require('./lib/get-widget-content')
const syncGoodreadsData = require('./jobs/sync-goodreads-data')
const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyTopTracks = require('./jobs/sync-spotify-top-tracks')

const firebaseServiceAccountToken = require('./token.json')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com',
})

exports.syncGoodreadsData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncGoodreadsData())

exports.syncSpotifyTopTracks = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncSpotifyTopTracks())

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
  'http://dev-chrisvogt.me:8000',
  'http://localhost:8000',
  'https://chrisvogt.me',
  'https://dev-chrisvogt.me:8000',
  'https://dev-chrisvogt.me',
  'https://localhost:8000',
  'https://www.chrisvogt.me',
  'localhost:8000',
]

// NOTE(chrisvogt): adapted from https://expressjs.com/en/resources/middleware/cors.html
const corsOptionsDelegate = (req, callback) => {
  const isAllowedOrigin = corsAllowList.includes(req.header('Origin'))
  const corsOptions = isAllowedOrigin ? { origin: true } : { origin: false }

  return callback(null, corsOptions)
}

app.get('/debug/sync/goodreads', async (req, res) => {
  const result = await syncGoodreadsData()
  res.status(200).send(result)
})

app.get(
  '/api/widgets/:provider',
  cors(corsOptionsDelegate),
  async (req, res) => {
    const { params: { provider } = {} } = req

    if (!provider || !validWidgetIds.includes(provider)) {
      const response = buildFailureResponse({
        message: 'A valid provider type is required.',
      })
      res.status(404).send(response)
      return res.end()
    }

    try {
      const githubWidgetContent = await getWidgetContent(provider)
      const response = buildSuccessResponse(githubWidgetContent)
      res.set('Cache-Control', 'public, max-age=14400, s-maxage=43200')
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
})

exports.app = functions.https.onRequest(app)
