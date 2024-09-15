const { db } = require('../firebase')
const { DATABASE_COLLECTION_STEAM } = require('../constants')
const { Timestamp } = require ('firebase/firestore')

const getSteamWidgetContent = async () => {
  const doc = await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('widget-content')
    .get()

  const { meta = {}, ...responseData } = doc.data()

  const transformedMeta = {
    ...meta,
    synced: new Timestamp(
      meta.synced._seconds,
      meta.synced._nanoseconds
    ).toDate(),
  }

  return {
    ...responseData,
    meta: transformedMeta,
  }
}

module.exports = getSteamWidgetContent
