const { items } = require('./top-tracks.mock.json')

const getTopTracks = async () => {
  return items
}

module.exports = getTopTracks
