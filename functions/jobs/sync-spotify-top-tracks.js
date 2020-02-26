const getSpotifyTopTracks = require('../lib/get-spotify-top-tracks')

const syncSpotifyTopTracks = async ({ database }) => {
  let topTracks
  try {
    const { items = [] } = (await getSpotifyTopTracks()) || {}
    topTracks = items
  } catch (error) {
    console.error('Get top tracks failed', error)
    return {
      result: 'FAILURE',
      message: 'Failed to fetch top tracks.'
    }
  }

  if (!topTracks.length > 0) {
    return {
      result: 'FAILURE',
      message: 'No tracks were returned.'
    }
  }

  const docRef = database.collection('spotify').doc('top-tracks')

  await docRef.set({
    timestamp: Date.now(),
    items: topTracks
  })

  return {
    result: 'SUCCESS'
  }
}

module.exports = syncSpotifyTopTracks
