const admin = require('firebase-admin')

const getReview = require('../lib/get-review')
const getUserStatus = require('../lib/get-user-status')
const fetchUser = require('../api/goodreads/fetch-user')
const fetchRecentlyReadBooks = require('../api/goodreads/fetch-recently-read-books')

/*

Sync Goodreads Data

The goal of this job is to store both the client-ready and original forms of the
Goodreads user profile and latest books data.

* concurrent

- [ ] Fetch Goodreads user profile
- [ ] Fetch Goodreads recently read shelf

* sync

- [ ] Store the Goodreads user profile raw response
- [ ] Store the Goodreads recently read shelf raw response
- [ ] Store the transformed, combined Goodreads data

*/

const syncGoodreadsData = async () => {
  let bookReviews
  let jsonResponse
  let profile
  let recentlyReadBooks
  let updates

  try {
    const [user, recentlyRead] = await Promise.all([
      fetchUser(),
      fetchRecentlyReadBooks(),
    ])

    jsonResponse = user.jsonResponse
    profile = user.profile
    updates = user.updates

    bookReviews = recentlyRead.bookReviews
    recentlyReadBooks = recentlyRead.books
  } catch (error) {
    console.error('Failed to fetch Goodreads data.', error)
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
        response: bookReviews,
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
    console.error('Failed to save Goodreads data to database.', err)
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
