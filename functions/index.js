const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const express = require('express')
const functions = require('firebase-functions')

const { getWidgetContent, validWidgetIds } = require('./lib/get-widget-content')
const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyTopTracks = require('./jobs/sync-spotify-top-tracks')

const firebaseServiceAccountToken = require('./token.json')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com',
})

exports.syncSptifyTopTracks = functions.pubsub
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

app.get('/api/widgets/:provider', async (req, res) => {
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
    res.status(200).send(response)
  } catch (err) {
    const response = buildFailureResponse(err)
    res.status(400).send(response)
  }

  return res.end();
})

app.get('*', (req, res) => {
  res.status(404).send(404)
})

exports.app = functions.https.onRequest(app)
