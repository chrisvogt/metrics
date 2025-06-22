import got from 'got'

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1/'

const getPlaylists = async accessToken => {
  const { body } = await got('me/playlists', {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'json',
    prefixUrl: SPOTIFY_BASE_URL,
    searchParams: {
      limit: 14,
      offset: 0
    }
  })
  
  return body
}

export default getPlaylists
