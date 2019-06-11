const request = require('request-promise');

const getYesterdayAsString = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const SEP = '/';
  const dd = date.getDate().toString().padStart('2', 0);
  const mm = (date.getMonth() + 1).toString().padStart('2', 0);
  const yyyy = date.getFullYear();

  return `${mm}${SEP}${dd}${SEP}${yyyy}`;
};

const syncYesterdaysCodeSummary = ({ config, database }) => async () => {
  const { wakatime: { username, access_token: accessToken } } = config;

  const yesterday = getYesterdayAsString();
  const yesterdayFormatted = yesterday.replace(/\//g, '');

  const SUMMARIES_URL = `https://wakatime.com/api/v1/users/${ username }/summaries`;
  const summaries = await request({
    headers: { Authorization: `Basic ${ accessToken }` },
    json: true,
    qs: {
      end: yesterday,
      start: yesterday
    },
    resolveWithFullResponse: true,
    uri: SUMMARIES_URL,
  });

  if (summaries.statusCode >= 400) {
    throw new Error(`HTTP Error: ${response.statusCode}`);
  }

  const { body: { data } = {} } = summaries;
  const docRef = database
    .collection('summaries')
    .doc(yesterdayFormatted);

  try {
    await docRef.set({ raw: data });
    return {
      reference: yesterdayFormatted,
      result: 'success'
    };
  } catch (err) {
    await docRef.set({ error });
    return {
      date: yesterday,
      result: 'failure'
    };
  }
};

module.exports = syncYesterdaysCodeSummary;
