import got from 'got'

const ENDPOINT =
  'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/'

const getRecentlyPLayedGames = async (apiKey, userId) => {
  const {
    body: { response: { games = [] } = {} },
  } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: {
      key: apiKey,
      steamid: userId,
    },
  })

  return games
}

export default getRecentlyPLayedGames
