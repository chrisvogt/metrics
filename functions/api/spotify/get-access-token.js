const { logger } = require('firebase-functions')
const request = require('request-promise')

const getAccessToken = async ({
  clientId,
  clientSecret,
  redirectURI,
  refreshToken
}) => {
  const {
    access_token: accessToken,
    expires_in: expiresInSec,
    scope
  } = await request.post({
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

  const leadTimeSec = 300
  const expiresAt = new Date()

  expiresAt.setSeconds(
    expiresAt.getSeconds() + (expiresInSec - leadTimeSec)
  )

  return {
    accessToken,
    expiresAt,
    scope
  }
}

module.exports = getAccessToken
