import { logger } from 'firebase-functions'
import got from 'got'
import xml2js from 'xml2js'

import getReview from '../../lib/get-review.js'
import getUserStatus from '../../lib/get-user-status.js'

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
  let userShelves = result?.GoodreadsResponse?.user?.user_shelves?.user_shelf ?? []
  // Ensure userShelves is always an array
  if (!Array.isArray(userShelves)) userShelves = []
  const readShelf = userShelves.filter((shelf) => shelf.name === 'read')[0]
  
  // Handle case where readShelf is undefined
  const bookCount = readShelf?.book_count?._ || ''
  
  const rawProfile = result?.GoodreadsResponse?.user ?? {}

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
  const rawUpdates = result?.GoodreadsResponse?.user?.updates?.update ?? []
  const isDefined = (subject) => Boolean(subject)
  const validateUpdate = (update) =>
    update && (update.type === 'userstatus' || update.type === 'review')

  // Ensure rawUpdates is always an array
  const updatesArray = Array.isArray(rawUpdates) ? rawUpdates : [rawUpdates]

  // Filter out undefined/null updates before checking type
  const updates = updatesArray
    .filter(isDefined)
    .filter(validateUpdate)
    .map((update) => transformUpdate(update))
    .filter((update) => isDefined(update))

  return updates
}

const fetchUser = async () => {
  const key = process.env.GOODREADS_API_KEY
  const userID = process.env.GOODREADS_USER_ID
  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  return new Promise((resolve) => {
    parser.parseString(xml, (err, result) => {
      if (err) {
        logger.error('Error fetching Goodreads user data.', err)
        resolve({
          jsonResponse: undefined,
          profile: undefined,
          updates: undefined,
        })
        return
      }

      const jsonResponse = result
      const profile = getProfileFromResponse(result)
      const updates = getUpdatesFromResponse(result)

      resolve({
        jsonResponse,
        profile,
        updates,
      })
    })
  })
}

export default fetchUser
