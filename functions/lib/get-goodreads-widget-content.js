const { db } = require('../firebase')
const { Timestamp } = require ('firebase/firestore')

const getGoodreadsWidgetContent = async () => {
  const doc = await db.collection('goodreads').doc('widget-content').get()
  const {meta, ...responseData} = doc.data()

  const transformedMeta = {
    ...meta,
    synced: new Timestamp(meta.synced._seconds, meta.synced._nanoseconds).toDate(),
  }

  return {
    ...responseData,
    meta: transformedMeta,
  }
}

module.exports = getGoodreadsWidgetContent
