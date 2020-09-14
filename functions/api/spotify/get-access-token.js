const { logger } = require('firebase-functions')
const request = require('request-promise')

const getAccessToken = async auth => {
  const { clientId, clientSecret, redirectURI, refreshToken } = auth

  try {
    const response = await request.post({
      form: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: redirectURI
      },
      fullResponse: false,
      json: true,
      retryStrategy: err => !!err,
      url: 'https://accounts.spotify.com/api/token'
    })

    const {
      access_token: accessToken,
      expires_in: expiresInSec,
      scope
    } = response || {};

    const leadTimeSec = 300
    const expiresAt = new Date()

    expiresAt.setSeconds(
      expiresAt.getSeconds() + (expiresInSec - leadTimeSec)
    )

    const accessTokenObj = {
      accessToken,
      expiresAt,
      scope
    }

    return [accessTokenObj, null]
  } catch (err) {
    logger.log('Error fetching Spotify user access token.', err);
    const { error } = err
    return [null, error]
  }
}

module.exports = getAccessToken
