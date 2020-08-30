const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const express = require('express')
const functions = require('firebase-functions')

const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyTopTracks = require('./jobs/sync-spotify-top-tracks')

const getGitHubWidgetContent = require('./lib/get-github-widget-content')
const getGoodreadsWidgetContent = require('./lib/get-goodreads-widget-content')
const getInstagramWidgetContent = require('./lib/get-instagram-widget-content')
const getSpotifyWidgetContent = require('./lib/get-spotify-widget-content')

const getPinnedRepositories = require('./get-pinned-repositories')
const getWidgetContent = require('./get-widget-content')

const firebaseServiceAccountToken = require('./token.json')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com'
})

// TODO(chrisvogt): factor out all uses of this "context" object – it's not needed
const config = functions.config()
const database = admin.firestore()
const context = { config, database }

exports.syncSptifyTopTracks = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncSpotifyTopTracks(context));

exports.syncInstagramData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(() => syncInstagramData());

exports.getPinnedRepositories = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    const repositories = await getPinnedRepositories(context)
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400')
    res.set('Access-Control-Allow-Origin', '*')
    res.status(200).send(repositories)
  })
})

exports.getSummaries = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    const summariesRef = database.collection('summaries').doc('last_30_days')
    const doc = await summariesRef.get()
    const data = doc.data()
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400')
    res.set('Access-Control-Allow-Origin', '*')
    res.status(200).send(data)
  })
})

exports.debugSyncSpotify = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    const response = await syncSpotifyTopTracks(context)
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400')
    res.set('Access-Control-Allow-Origin', '*')
    res.status(200).send(response)
  })
})


const buildSuccessResponse = payload => ({
  ok: true,
  payload
})

const buildFailureResponse = (err = {}) => ({
  ok: false,
  error: err.message || err
})

// NOTE(chrisvogt): the widgets API is the first set of endpoints to use Express
// instead of direct Firebase routes.

const app = express()

app.get('/api/widgets', (req, res) => {
  console.log('MULTI-WIDGET')
  res.status(200).send('multi-widget endpoint')
})

app.get('/api/widgets/github', async (req, res) => {
  try {
    const githubWidgetContent = await getGitHubWidgetContent({ context })
    const response = buildSuccessResponse(githubWidgetContent)
    res.status(200).send(response)
  } catch (err) {
    const response = buildFailureResponse(err)
    res.status(400).send(response)
  }
})

app.get('/api/widgets/goodreads', async (req, res) => {
  try {
    const goodreadsWidgetContent = await getGoodreadsWidgetContent({ context })
    const response = buildSuccessResponse(goodreadsWidgetContent)
    res.status(200).send(response)
  } catch (err) {
    const response = buildFailureResponse(err)
    res.status(400).send(response)
  }
})

app.get('/api/widgets/instagram', async (req, res) => {
  try {
    const instagramWidgetContent = await getInstagramWidgetContent()
    const response = buildSuccessResponse(instagramWidgetContent)
    res.status(200).send(response)
  } catch (err) {
    const response = buildFailureResponse(err)
    res.status(400).send(response)
  }
})

app.get('/api/widgets/spotify', async (req, res) => {
  try {
    const spotifyWidgetContent = await getSpotifyWidgetContent()
    const response = buildSuccessResponse(spotifyWidgetContent)
    res.status(200).send(response)
  } catch (err) {
    const response = buildFailureResponse(err)
    res.status(400).send(response)
  }

})

exports.app = functions.https.onRequest(app)

// exports.widgetContentAPI = functions.https.onRequest(async (req, res) => {
//   return cors(req, res, async () => {
//     try {
//       console.log(req.params);
//       res.status(200).send('ok')
//       return req.params
//       const payload = await getSpotifyWidgetContent()
//       res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400')
//       res.set('Access-Control-Allow-Origin', '*')
//       res.status(200).send({
//         ok: true,
//         payload
//       })
//     } catch (error) {
//       const { message } = error
//       res.status(400).send({
//         ok: false,
//         error: { message }
//       })
//     }
//   })
// })

