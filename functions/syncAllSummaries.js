const FieldValue = require('firebase-admin').firestore.FieldValue;
const getSummaries = require('./api/wakatime/get-summaries');
const moment = require('moment');

const ymdFormat = 'YYYY-MM-DD';
const ranges = [{
    name: 'last_7_days',
    end: moment().format(ymdFormat),
    start: moment().day(-7).format(ymdFormat)
}, {
    name: 'last_30_days',
    end: moment().format(ymdFormat),
    start: moment().day(-30).format(ymdFormat)
}, {
    name: 'last_90_days',
    end: moment().format(ymdFormat),
    start: moment().day(-90).format(ymdFormat)
}];

const syncAllStats = ({ config, database }) => async () => {
    const options = { accessToken: config.wakatime.access_token };

    const summaryPromises = ranges.map(async range => {
        const { end, name, start } = range;
        const query = { end, start };
        const { error, ok, summaries } = await getSummaries(query, options)

        if (ok) {
            return {
                name,
                summaries,
                timestamp: FieldValue.serverTimestamp()
            };
        }

        console.error(`Failed fetching ${name} data from WakaTime.`, { error });
    });

    const results = await Promise.all(summaryPromises);
    const updatePromises = results.map(async result => {
        const { name, summaries, timestamp } = result;
        const docRef = database
            .collection('summaries')
            .doc(name);
        await docRef.set({
            name,
            summaries,
            timestamp
        });
    });
    
    await Promise.all(updatePromises);

    console.info('Completed syncing summaries.', {
        updatedDocs: results.map(result => result.name)
    });
};

module.exports = syncAllStats;
