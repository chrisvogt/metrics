const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const fetchUser = require('../api/goodreads/fetch-user')
const fetchRecentlyReadBooks = require('../api/goodreads/fetch-recently-read-books')

/**
 * Sync Goodreads Data
 */
const syncGoodreadsData = async () => {
  const fetchGoodreadsData = new Promise(async resolve => {
    try {
      const [user = {}, recentlyRead = {}] = await Promise.all([
        fetchUser(),
        fetchRecentlyReadBooks(),
      ])
  
      return void resolve({
        collections: {
          recentlyReadBooks: recentlyRead.books,
          updates: user.updates
        },
        profile: user.profile,
        responses: {
          user: user.jsonResponse,
          reviews: recentlyRead.rawReviewsResponse,
        }
      })
    } catch (error) {
      return void resolve({
        error: error.message || error,
      })
    }
  })

  const {
    collections = {},
    error,
    profile = {},
    responses = {}
  } = await(fetchGoodreadsData)

  if (error) {
    logger.error('Failed to fetch Goodreads data.', error)
    return {
      result: 'FAILURE',
      error: error.message || error,
    }
  }

  const widgetContent = {
    collections,
    meta: {
      synced: admin.firestore.FieldValue.serverTimestamp(),
    },
    profile,
  };

  try {
    const db = admin.firestore()
    await Promise.all([
      await db.collection('goodreads').doc('last-response_user-show').set({
        response: responses.user,
        updated: admin.firestore.FieldValue.serverTimestamp(),
      }),
      await db.collection('goodreads').doc('last-response_book-reviews').set({
        response: responses.reviews,
        updated: admin.firestore.FieldValue.serverTimestamp(),
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
