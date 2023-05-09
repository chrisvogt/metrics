const admin = require('firebase-admin')
const { Timestamp } = require('firebase/firestore')

const getSpotifyWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection('spotify').doc('widget-content').get()
  const { meta, ...responseData } = doc.data()

  const transformedMeta = {
    ...meta,
    synced: new Timestamp(meta.synced._seconds, meta.synced._nanoseconds).toDate()
  }

  return {
    ...responseData,
    meta: transformedMeta
  }
}

module.exports = getSpotifyWidgetContent
