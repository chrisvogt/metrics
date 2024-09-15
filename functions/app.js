// Express app attached to the onRoute() handler. All HTTP requests are
// forwarded to this app.

const express = require('express')
const cors = require('cors')
const { logger } = require('firebase-functions')
const { getWidgetContent, validWidgetIds } = require('./lib/get-widget-content')
const syncGoodreadsData = require('./jobs/sync-goodreads-data')
const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyData = require('./jobs/sync-spotify-data')
const syncSteamData = require('./jobs/sync-steam-data')

const app = express()

const corsAllowList = [
  /https?:\/\/([a-z0-9]+[.])*chrisvogt[.]me$/,
  /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
  /\.netlify\.app$/,
]

const corsOptions = {
  origin: corsAllowList,
}

const buildSuccessResponse = (payload) => ({
  ok: true,
  payload,
})

const buildFailureResponse = (err = {}) => ({
  ok: false,
  error: err.message || err,
})

const syncHandlersByProvider = {
  goodreads: syncGoodreadsData,
  instagram: syncInstagramData,
  spotify: syncSpotifyData,
  steam: syncSteamData,
}

// Route to manually trigger data sync
app.get('/api/widgets/sync/:provider', async (req, res) => {
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
    logger.error('Error syncing data manually.', err)
    res.status(500).send({ error: err })
  }
})

// Route to get widget content
app.get('/api/widgets/:provider', cors(corsOptions), async (req, res) => {
  const provider = req.params.provider

  if (!provider || !validWidgetIds.includes(provider)) {
    const response = buildFailureResponse({
      message: 'A valid provider type is required.',
    })
    res.status(404).send(response)
    return
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
})

// Catch-all route for undefined endpoints
app.get('*', (req, res) => {
  res.sendStatus(404)
})

module.exports = app
