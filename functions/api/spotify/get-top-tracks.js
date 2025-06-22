import request from 'requestretry'

const getTopTracks = async accessToken => {
  const { items } = await request({
    fullResponse: false,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
    qs: {
      time_range: 'short_term',
      limit: 12
    },
    retryStrategy: err => !!err,
    uri: 'https://api.spotify.com/v1/me/top/tracks'
  })

  if (!items || !items.length > 0) {
    throw new Error('No top tracks returned from Spotify.')
  }
  
  return items
}

export default getTopTracks
