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

  return player.length ? player[0] : player
}

export default getPlayerSummary
