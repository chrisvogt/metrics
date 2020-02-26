const getTopTracksFromDb = async ({ database }) => {
  const docRef = database.collection('spotify').doc('top-tracks')

  console.log('getting top tracks from db', docRef)

  const doc = await docRef.get()
  const { items } = doc.data()

  return items
}

module.exports = getTopTracksFromDb
