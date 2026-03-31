import spotifyClient from './spotify-client.js'

const getUserProfile = async accessToken => {
  const { body } = await spotifyClient('me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  
  return body
}

export default getUserProfile
