'use strict';

const request = require('request-promise');

const statsList = [
  'last_7_days',
  'last_30_days',
  'last_6_months',
  'last_year'
];

const syncAllStats = ({ config, database }) => async () => {
  const baseUrl = `https://wakatime.com/api/v1/users/${ config.wakatime.username }`;
  const endpoint = '/stats';

  const statsPromises = statsList.map(async range => {
    const { body: { data } = {} } = await request({
      headers: { Authorization: `Basic ${ config.wakatime.access_token }` },
      json: true,
      resolveWithFullResponse: true,
      uri: baseUrl + endpoint + `/${range}`,
    });
    return data;
  });

  const results = await Promise.all(statsPromises);
  const resultList = statsList.map((key, index) => {
    return {
      name: key,
      value: results[index]
    };
  });

  resultList.forEach(async ({name, value}) => {
    const docRef = database
      .collection('stats')
      .doc(name);
      await docRef.set({
        timestamp: Date.now(),
        data: value
      });
  })

  return resultList;
};

module.exports = syncAllStats;
