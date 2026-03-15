import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import { toProviderCollectionPath } from '../config/backend-paths.js'

const getSpotifyWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection(toProviderCollectionPath('spotify')).doc('widget-content').get()
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

export default getSpotifyWidgetContent
