'use strict';

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const cors = require('cors')({
  origin: true,
});

const getGoodreadsUpdates = require('./getGoodreadsUpdates');
const getPinnedRepositories = require('./getPinnedRepositories');
const getLanguagesFromSummaries = require('./lib/get-languages-from-summaries');
const getTimesFromSummaries = require('./lib/get-times-from-summaries');
const syncAllStats = require('./syncAllStats');
const syncAllSummaries = require('./syncAllSummaries');

const token = require('./token.json');

admin.initializeApp({
  credential: admin.credential.cert(token),
  databaseURL: 'https://personal-stats-chrisvogt.firebaseio.com'
});

const config = functions.config();
const database = admin.firestore();
const context = { config, database };

exports.syncAllStats = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncAllStats(context));

exports.syncAllSummaries = functions.pubsub
  .schedule('every day 02:00')
  .onRun(syncAllSummaries(context));

exports.getPinnedRepositories = functions.https
  .onRequest(async (req, res) => {
    return cors(req, res, async () => {
      const repositories = await getPinnedRepositories(context);
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).send(repositories);
    })
  });

exports.getSummaries = functions.https
  .onRequest(async (req, res) => {
    return cors(req, res, async () => {
      const summariesRef = database.collection('summaries')
      const summariesDoc = await summariesRef.doc('last_30_days').get();
      const { summaries = [] } = summariesDoc.data();

      const data = {
        languages: getLanguagesFromSummaries(summaries),
        timesByDay: getTimesFromSummaries(summaries)
      };

      res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).send(data);
    })
  });

exports.getGoodreadsUpdates = functions.https
  .onRequest(async (req, res) => {
    return cors(req, res, async () => {
      const updates = await getGoodreadsUpdates(context);
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      res.set('Access-Control-Allow-Origin', '*');
      res.status(200).send(updates);
    })
  });
