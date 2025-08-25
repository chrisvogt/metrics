import got from 'got'

const ENDPOINT =
  'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/'

const getPlayerSummary = async (apiKey, userId) => {
  const {
    body: { response: { players: [player] = [] } = {} },
  } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: {
      key: apiKey,
      steamids: userId,
    },
  })

  // Return empty array if no players, otherwise return the first player
  return player ? player : []
}

export default getPlayerSummary
