import request from 'requestretry'

const getUserProfile = async accessToken => {
  const response = await request({
    fullResponse: false,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
    retryStrategy: err => !!err,
    uri: 'https://api.spotify.com/v1/me'
  })
  
  return response
}

export default getUserProfile
