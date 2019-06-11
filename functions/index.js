const fetchAllStats = require('./fetchAllStats');
const syncYesterdaysCodeSummary = require('./syncYesterdaysCodeSummary');

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const request = require('request-promise');

const token = require('./token.json');

admin.initializeApp({
  credential: admin.credential.cert(token),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com'
});

const database = admin.firestore();
const context = { config: functions.config(), database };

exports.fetchAllStats = functions.https
  .onRequest(async (req, res) => {
    const stats = await fetchAllStats(req, res, context);
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400');
    res.send(stats);
  });

exports.syncYesterdaysCodeSummary = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncYesterdaysCodeSummary(context));
