const got = require('got')

const ENDPOINT =
  'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/'

const getOwnedGames = async (apiKey, userId) => {
  const { body: { response = {} } = {} } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: {
      key: apiKey,
      steamid: userId,
    },
  })

  return response
}

module.exports = getOwnedGames
