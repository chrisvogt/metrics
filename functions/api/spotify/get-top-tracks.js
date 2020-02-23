const request = require('requestretry')

const getTopTracks = async accessToken => {
  try {
    const response = await request({
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

    return [response, null];
  } catch (error) {
    console.error('Error fetching top tracks from Spotify.');
    return [null, error];
  }
}

module.exports = getTopTracks
