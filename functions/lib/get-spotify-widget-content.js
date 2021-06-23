const admin = require('firebase-admin')

const getSpotifyWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection('spotify').doc('widget-content').get()
  const { meta, ...responseData } = doc.data()

  const transformedMeta = {
    ...meta,
    // NOTE(chrisvogt): tranforms the last synced timestamp into a JS Date object
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

module.exports = getSpotifyWidgetContent
