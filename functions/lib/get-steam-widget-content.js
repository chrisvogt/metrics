const admin = require('firebase-admin')
const { DATABASE_COLLECTION_STEAM } = require('../constants')

const getSteamWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db
    .collection(DATABASE_COLLECTION_STEAM)
    .doc('widget-content')
    .get()

  const { meta = {}, ...responseData } = doc.data()

  const transformedMeta = {
    ...meta,
    // NOTE(chrisvogt): tranform the last synced timestamp into a JS Date object
    synced: new admin.firestore.Timestamp(
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
