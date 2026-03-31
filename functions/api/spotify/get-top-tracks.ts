import spotifyClient from './spotify-client.js'

const getTopTracks = async accessToken => {
  const { body } = await spotifyClient('me/top/tracks', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    searchParams: {
      time_range: 'short_term',
      limit: 12
    }
  })
  const { items } = body

  if (!items || items.length === 0) {
    throw new Error('No top tracks returned from Spotify.')
  }
  
  return items
}

export default getTopTracks
