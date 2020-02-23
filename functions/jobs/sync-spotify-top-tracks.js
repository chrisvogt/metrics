const getSpotifyTopTracks = require('../lib/get-spotify-top-tracks')

const syncSpotifyTopTracks = async ({ database }) => {
  try {
    const topTracks = await getSpotifyTopTracks()
    const { items } = topTracks

    if (!topTracks || !topTracks.length) {
      return {
        result: 'FAILURE'
      }
    }

    const docRef = database.collection('spotify').doc('top-tracks')

    await docRef.set({
      timestamp: Date.now(),
      items
    })

    return {
      result: 'SUCCESS'
    }
  } catch (error) {
    console.log('Failure', error)
    return {
      result: 'FAILURE'
    }
  }
}

module.exports = syncSpotifyTopTracks
