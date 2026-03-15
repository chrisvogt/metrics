import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import { toProviderCollectionPath } from '../config/backend-paths.js'

const getSteamWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db
    .collection(toProviderCollectionPath('steam'))
    .doc('widget-content')
    .get()

  const data = doc.data()
  if (!data) {
    return { meta: { synced: new Date(0) } }
  }

  const { meta = {}, ...responseData } = data

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
