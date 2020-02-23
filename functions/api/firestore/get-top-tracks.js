const getTopTracksFromDb = async ({ database }) => {
  const docRef = database.collection('spotify').doc('top-tracks')

  const doc = await docRef.get()
  const { items } = doc.data()

  return items;
};

module.exports = getTopTracksFromDb
