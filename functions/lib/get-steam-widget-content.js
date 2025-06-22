import admin from 'firebase-admin'
import { DATABASE_COLLECTION_STEAM } from '../constants.js'
import { Timestamp } from 'firebase/firestore'

const getSteamWidgetContent = async () => {
  const db = admin.firestore()
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

export default getSteamWidgetContent
