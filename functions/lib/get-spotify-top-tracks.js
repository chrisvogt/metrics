const functions = require('firebase-functions')
const getSpotifyAccessToken = require('../api/spotify/get-access-token')
const getSpotifyTopTracks = require('../api/spotify/get-top-tracks')

const getSpotifyContent = async () => {
  const config = functions.config()

  const {
    spotify: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    } = {}
  } = config

  const [accessTokenObj, accessTokenError] = await getSpotifyAccessToken({
    clientId,
    clientSecret,
    refreshToken
  })

  if (accessTokenError || !accessTokenObj) {
    console.error('Failed to get the Spotify access token', accessTokenError)
    throw new Error('Failed to get the Spotify access token')
  }

  const { accessToken } = accessTokenObj
  const [topTracks, topTracksError] = await getSpotifyTopTracks(accessToken)

  if (topTracksError) {
    console.error('Failed to get the top tracks from Spotify', topTracksError)
    throw new Error('Failed to fetch the top tracks from Spotify')
  }

  return topTracks
}

module.exports = getSpotifyContent
