const getTopTracksFromDb = async ({ database }) => {
  const topTracksRef = database.doc('spotify/top-tracks')
  let items

  try {
    const doc = (await topTracksRef.get()) || {}
    const data = doc.data() || {}
    items = data.items || []
  } catch (error) {
    throw error
  }

  return items
}

module.exports = getTopTracksFromDb
