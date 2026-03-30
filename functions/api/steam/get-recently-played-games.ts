import got from 'got'

import type { SteamApiGame } from '../../types/steam.js'

const ENDPOINT =
  'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/'

const getRecentlyPLayedGames = async (
  apiKey: string,
  userId: string,
): Promise<SteamApiGame[]> => {
  const { body } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: {
      key: apiKey,
      steamid: userId,
    },
  })
  if (body == null || typeof body !== 'object') {
    throw new Error('Invalid response')
  }
  const response = (body as { response?: { games?: SteamApiGame[] } })?.response
  return response?.games ?? []
}

export default getRecentlyPLayedGames
