const admin = require('firebase-admin')
const functions = require('firebase-functions')
const get = require('lodash/get')
const got = require('got')
const xml2js = require('xml2js')

const getReview = require('../lib/get-review')
const getUserStatus = require('../lib/get-user-status')

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

const transformUpdate = (update) => {
  if (update.type === 'userstatus') {
    return getUserStatus(update)
  }

  if (update.type === 'review') {
    return getReview(update)
  }

  return null
}

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
})

const getProfileFromResponse = (result) => {
  const readShelf = get(
    result,
    'GoodreadsResponse.user.user_shelves.user_shelf',
    []
  ).filter((shelf) => shelf.name === 'read')[0]
  const { book_count: { _: bookCount = '' } = {} } = readShelf
  const rawProfile = get(result, 'GoodreadsResponse.user', {})

  const {
    name,
    user_name: username,
    link,
    image_url: imageURL,
    small_image_url: smallImageURL,
    website,
    joined,
    interests,
    favorite_books: favoriteBooks,
    friends_count: { _: friendsCount = '' } = {},
  } = rawProfile

  return {
    name,
    username,
    link,
    imageURL,
    smallImageURL,
    website,
    joined,
    interests,
    favoriteBooks,
    friendsCount,
    readCount: Number(bookCount),
  }
}

const getUpdatesFromResponse = (result) => {
  const rawUpdates = get(result, 'GoodreadsResponse.user.updates.update', [])
  const isDefined = (subject) => Boolean(subject)
  const validateUpdate = (update) =>
    update.type === 'userstatus' || update.type === 'review'

  // TODO: only show the latest `type: userstatus` per unique `book.goodreadsID`.
  // otherwise, show every `type: review'.
  const updates = rawUpdates
    .filter((update) => validateUpdate(update))
    .map((update) => transformUpdate(update))
    .filter((update) => isDefined(update))

  return updates
}

const syncGoodreadsData = async () => {
  const config = functions.config()
  const { goodreads: { key, user_id: userID } = {} } = config

  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  let jsonResponse
  let profile
  let updates

  parser.parseString(xml, (err, result) => {
    if (err) {
      console.error('An error!', err)
    }

    jsonResponse = result
    profile = getProfileFromResponse(result)
    updates = getUpdatesFromResponse(result)
  })

  // Store the response data
  const db = admin.firestore()
  db.settings({
    // Without setting `ignoreUndefinedProperties` here, some value in updates
    // causes Firestore to throw an exception on save
    ignoreUndefinedProperties: true
  })

  const saveLastResponse = async () => {
    return await db.collection('goodreads').doc('last-response_user-show').set({
      response: jsonResponse,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  const saveWidgetContent = async () => {
    return await db
      .collection('goodreads')
      .doc('widget-content')
      .set({
        meta: {
          synced: admin.firestore.FieldValue.serverTimestamp(),
        },
        profile,
        updates,
      })
  }

  try {
    const saveResult = await Promise.all(
      [saveLastResponse()],
      [saveWidgetContent()]
    )

    console.log('SAVE RESULT ----------------------', saveResult)

    return {
      result: 'SUCCESS',
      profile,
    }
  } catch (err) {
    console.error('Failed to save Spotify data to db.', err)
    return {
      result: 'FAILURE',
      error: err,
    }
  }
}

module.exports = syncGoodreadsData
