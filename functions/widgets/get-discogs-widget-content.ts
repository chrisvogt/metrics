import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import { toProviderCollectionPath } from '../config/backend-paths.js'

const getDiscogsWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection(toProviderCollectionPath('discogs')).doc('widget-content').get()
  const { meta, ...responseData } = doc.data()

  const transformedMeta = {
    ...meta,
    ...(meta?.synced && {
      synced: new Timestamp(meta.synced._seconds, meta.synced._nanoseconds).toDate()
    })
  }

  return {
    ...responseData,
    meta: transformedMeta
  }
}

export default getDiscogsWidgetContent
