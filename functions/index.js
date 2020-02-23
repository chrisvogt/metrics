const admin = require('firebase-admin')
const cors = require('cors')({ origin: true })
const functions = require('firebase-functions')

const syncSpotifyTopTracks = require('./jobs/sync-spotify-top-tracks')
const getPinnedRepositories = require('./get-pinned-repositories')
const getWidgetContent = require('./get-widget-content')

const firebaseServiceAccountToken = require('./token.json')

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccountToken),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com'
})

const config = functions.config()
const database = admin.firestore()
const context = { config, database }

exports.syncSpotifyTopTracks = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncSpotifyTopTracks(context));

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

exports.getWidgetContent = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const response = await getWidgetContent({ context, req })
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400')
      res.set('Access-Control-Allow-Origin', '*')
      res.status(200).send({
        ok: true,
        payload: response
      })
    } catch (error) {
      const { message } = error
      res.status(400).send({
        ok: false,
        error: { message }
      })
    }
  })
})
