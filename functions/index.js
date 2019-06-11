const getLatestRepositories = require('./getLatestRepositories');
const syncAllStats = require('./syncAllStats');
const syncYesterdaysCodeSummary = require('./syncYesterdaysCodeSummary');

const admin = require('firebase-admin');
const functions = require('firebase-functions');

const token = require('./token.json');

admin.initializeApp({
  credential: admin.credential.cert(token),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com'
});

const database = admin.firestore();
const context = { config: functions.config(), database };

exports.syncAllStats = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncAllStats(context));

exports.syncYesterdaysCodeSummary = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncYesterdaysCodeSummary(context));

exports.getLatestRepositories = functions.https
  .onRequest(async (req, res) => {
    const repositories = await getLatestRepositories(context);
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    res.send(repositories);
  });