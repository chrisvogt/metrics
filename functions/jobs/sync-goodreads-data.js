const { db } = require('../firebase')
const { logger } = require('firebase-functions')
const { FieldValue } = require('@google-cloud/firestore')

const fetchUser = require('../api/goodreads/fetch-user')
const fetchRecentlyReadBooks = require('../api/goodreads/fetch-recently-read-books')

const fetchAllGoodreadsPromises = async () => {
  try {
    const [user = {}, recentlyRead = {}] = await Promise.all([
      fetchUser(),
      fetchRecentlyReadBooks(),
    ])

    return {
      collections: {
        recentlyReadBooks: recentlyRead.books,
        updates: user.updates
      },
      profile: user.profile,
      responses: {
        user: user.jsonResponse,
        reviews: recentlyRead.rawReviewsResponse,
      }
    }
  } catch (error) {
    return {
      error: error.message || error,
    }
  }
}

/**
 * Sync Goodreads Data
 */
const syncGoodreadsData = async () => {
  const {
    collections = {},
    error,
    profile = {},
    responses = {}
  } = await fetchAllGoodreadsPromises()

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
      synced: FieldValue.serverTimestamp(),
    },
    profile,
  }

  try {
    await Promise.all([
      await db.collection('goodreads').doc('last-response_user-show').set({
        response: responses.user,
        updated: FieldValue.serverTimestamp(),
      }),
      await db.collection('goodreads').doc('last-response_book-reviews').set({
        response: responses.reviews,
        updated: FieldValue.serverTimestamp(),
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
