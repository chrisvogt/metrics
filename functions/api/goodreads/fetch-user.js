const { config, logger } = require('firebase-functions')
const get = require('lodash/get')
const got = require('got')
const xml2js = require('xml2js')

const getReview = require('../../lib/get-review')
const getUserStatus = require('../../lib/get-user-status')

const transformUpdate = update => {
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

const getProfileFromResponse = result => {
  const readShelf = get(
    result,
    'GoodreadsResponse.user.user_shelves.user_shelf',
    []
  ).filter(shelf => shelf.name === 'read')[0]
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

const getUpdatesFromResponse = result => {
  const rawUpdates = get(result, 'GoodreadsResponse.user.updates.update', [])
  const isDefined = subject => Boolean(subject)
  const validateUpdate = update =>
    update.type === 'userstatus' || update.type === 'review'

  // TODO: only show the latest `type: userstatus` per unique `book.goodreadsID`.
  // otherwise, show every `type: review'.
  const updates = rawUpdates
    .filter(update => validateUpdate(update))
    .map(update => transformUpdate(update))
    .filter(update => isDefined(update))

  return updates
}

const fetchUser = async () => {
  const { goodreads: { key, user_id: userID } = {} } = config()
  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  let jsonResponse
  let profile
  let updates

  parser.parseString(xml, (err, result) => {
    if (err) {
      logger.error('Error fetching Goodreads user data.', err)
    }

    jsonResponse = result
    profile = getProfileFromResponse(result)
    updates = getUpdatesFromResponse(result)
  })

  return {
    jsonResponse,
    profile,
    updates,
  }
}

module.exports = fetchUser
