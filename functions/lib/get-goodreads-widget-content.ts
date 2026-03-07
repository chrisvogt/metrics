import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import { DATABASE_COLLECTION_GOODREADS } from './constants.js'

const getGoodreadsWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection(DATABASE_COLLECTION_GOODREADS).doc('widget-content').get()
  const data = doc.data()

  if (!data) {
    return {
      meta: { synced: new Date(0) },
      recentBooks: [],
      summary: null,
    }
  }

  const { meta = {}, ...responseData } = data
  const rawSynced = meta.synced
  const syncedTimestamp = typeof rawSynced?.toDate === 'function'
    ? rawSynced.toDate()
    : rawSynced?._seconds != null
      ? new Timestamp(rawSynced._seconds, rawSynced._nanoseconds ?? 0).toDate()
      : new Date(0)

  const transformedMeta = {
    ...meta,
    synced: syncedTimestamp,
  }

  return {
    ...responseData,
    meta: transformedMeta,
  }
}

export default getGoodreadsWidgetContent
