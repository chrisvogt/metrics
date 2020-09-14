const admin = require('firebase-admin')
const { logger } = require('firebase-functions')

const fetchUser = require('../api/goodreads/fetch-user')
const fetchRecentlyReadBooks = require('../api/goodreads/fetch-recently-read-books')

/*

Sync Goodreads Data

The goal of this job is to store both the client-ready and original forms of the
Goodreads user profile and latest books data.

* concurrent

- [x] Fetch Goodreads user profile
- [x] Fetch Goodreads recently read shelf

* sync

- [x] Store the Goodreads user profile raw response
- [x] Store the Goodreads recently read shelf raw response
- [x] Store the transformed, combined Goodreads data

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
    // console.error('Failed to fetch Goodreads data.', error)
    logger.error('Failed to fetch Goodreads data.', error)
    return {
      result: 'FAILURE',
      error: error.message || error,
    }
  }

  const db = admin.firestore()
  db.settings({
    // Firestore throws when saving documents containing null values. The raw
    // Goodreads response object contains null values for unset fields. The
    // Firestore `ignoreUndefinedProperties` option enables support for fields
    // with null values.
    ignoreUndefinedProperties: true,
  })

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
      await db
        .collection('goodreads')
        .doc('widget-content')
        .set({
          meta: {
            synced: admin.firestore.FieldValue.serverTimestamp(),
          },
          profile,
          recentlyReadBooks,
          updates,
        }),
    ])
  } catch (err) {
    logger.error('Failed to save Goodreads data to database.', err)
    return {
      result: 'FAILURE',
      error: err.message || err,
    }
  }

  return {
    profile,
    recentlyReadBooks,
    result: 'SUCCESS',
    updates,
  }
}

module.exports = syncGoodreadsData
