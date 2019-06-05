const got = require('got');

const statsList = [
  'last_7_days',
  'last_30_days',
  'last_6_months',
  'last_year'
];

const getAllStats = async (req, res, context) => {
  const { config, database } = context;

  const baseUrl = `https://wakatime.com/api/v1/users/${ config.wakatime.username }`;
  const endpoint = '/stats';

  const client = got.extend({
    baseUrl,
    headers: {
      Authorization: `Basic ${ config.wakatime.access_token }`
    }
  });

  const statsPromises = statsList.map(range => {
    return (async () => {
      const { body } = await client.get(endpoint, {
        searchParams: { range }
      });
      const { data } = JSON.parse(body);
      return data;
    })()
  });

  const [
    last_7_days,
    last_30_days,
    last_6_months,
    last_year
  ] = await Promise.all(statsPromises);
  
  const result = {
    last_7_days,
    last_30_days,
    last_6_months,
    last_year
  };

  return result;
};

module.exports = getAllStats;
