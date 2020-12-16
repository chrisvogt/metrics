const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const fetchUser = require('../api/goodreads/fetch-user')
const fetchRecentlyReadBooks = require('../api/goodreads/fetch-recently-read-books')

/**
 * Sync Goodreads Data
 */
const syncGoodreadsData = async () => {
  let jsonResponse
  let profile
  let recentlyReadBooks
  let reviewsResponse
  let updates

  try {
    const [user, recentlyRead] = await Promise.all([
      fetchUser(),
      fetchRecentlyReadBooks(),
    ])

    jsonResponse = user.jsonResponse
    profile = user.profile
    updates = user.updates

    reviewsResponse = recentlyRead.rawReviewsResponse
    recentlyReadBooks = recentlyRead.books
  } catch (error) {
    logger.error('Failed to fetch Goodreads data.', error)
    return {
      result: 'FAILURE',
      error: error.message || error,
    }
  }

  const db = admin
    .firestore()
    .settings({
    // Firestore throws when saving documents containing null values and the
    // Goodreads response object contains null values for unset fields. The
    // Firestore `ignoreUndefinedProperties` option enables support for fields
    // with null values.
    ignoreUndefinedProperties: true,
  })

  const widgetContent = {
    collections: {
      recentlyReadBooks,
      updates,
    },
    meta: {
      synced: admin.firestore.FieldValue.serverTimestamp(),
    },
    profile,
  }

  try {
    await Promise.all([
      await db.collection('goodreads').doc('last-response_user-show').set({
        response: jsonResponse,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      await db.collection('goodreads').doc('last-response_book-reviews').set({
        response: reviewsResponse,
        fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
      await db.collection('goodreads').doc('widget-content').set(widgetContent),
    ])
  } catch (err) {
    logger.error('Failed to save Goodreads data to database.', err)
    return {
      result: 'FAILURE',
      error: err.message || err,
    }
  }

  return {
    result: 'SUCCESS',
    data: widgetContent
  }
}

module.exports = syncGoodreadsData
