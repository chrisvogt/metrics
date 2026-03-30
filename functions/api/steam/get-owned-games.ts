import got from 'got'

import type { SteamOwnedGamesResponse } from '../../types/steam.js'

const ENDPOINT =
  'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/'

const getOwnedGames = async (
  apiKey: string,
  userId: string,
): Promise<SteamOwnedGamesResponse> => {
  const { body } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: {
      key: apiKey,
      steamid: userId,
      include_appinfo: true
    },
  })
  if (body == null || typeof body !== 'object') {
    throw new Error('Invalid response')
  }
  const response = (body as { response?: SteamOwnedGamesResponse })?.response ?? {}
  return response
}

export default getOwnedGames
