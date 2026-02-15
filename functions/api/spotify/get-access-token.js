import got from 'got'

const getAccessToken = async ({
  clientId,
  clientSecret,
  redirectURI,
  refreshToken
}) => {
  const { body } = await got.post('https://accounts.spotify.com/api/token', {
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: redirectURI
    },
    responseType: 'json',
    retry: { limit: 2 }
  })

  const {
    access_token: accessToken,
    expires_in: expiresInSec,
    scope
  } = body

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

export default getAccessToken
