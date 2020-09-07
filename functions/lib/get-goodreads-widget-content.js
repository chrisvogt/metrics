const functions = require('firebase-functions')
const get = require('lodash/get')
const got = require('got')
const xml2js = require('xml2js')

const transformUpdate = require('./transform-update')

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
})

const getProfile = (result) => {
  const readShelf = get(
    result,
    'GoodreadsResponse.user.user_shelves.user_shelf',
    []
  ).filter((shelf) => shelf.name === 'read')[0]
  const { book_count: { _: bookCount = '' } = {} } = readShelf
  const rawProfile = get(result, 'GoodreadsResponse.user', {})

  const {
    name,
    user_name: userName,
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
    userName,
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

const getUpdates = (result) => {
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

const getGoodreadsWidgetContent = async () => {
  const config = functions.config()
  const { goodreads: { key, user_id: userID } = {} } = config

  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  let profile
  let updates

  parser.parseString(xml, (err, result) => {
    if (err) {
      console.error('An error!', err)
    }

    profile = getProfile(result)
    updates = getUpdates(result)
  })

  return {
    profile,
    updates,
  }
}

module.exports = getGoodreadsWidgetContent
