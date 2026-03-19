import { logger } from 'firebase-functions'
import got from 'got'
import xml2js from 'xml2js'

import getReview from '../../helpers/get-review.js'
import getUserStatus from '../../helpers/get-user-status.js'
import { getGoodreadsConfig } from '../../config/backend-config.js'

import type { GoodreadsProfile, GoodreadsUpdate } from '../../types/goodreads.js'

type FetchUserResult = {
  jsonResponse?: unknown
  profile?: GoodreadsProfile
  updates?: GoodreadsUpdate[]
}

const transformUpdate = (update: unknown): GoodreadsUpdate | null => {
  const u = update as { type?: string }

  if (u.type === 'userstatus') {
    return getUserStatus(u)
  }

  if (u.type === 'review') {
    return getReview(u)
  }

  return null
}

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
})

const getProfileFromResponse = (result: any): GoodreadsProfile => {
  let userShelves = result?.GoodreadsResponse?.user?.user_shelves?.user_shelf ?? []
  // Ensure userShelves is always an array
  if (!Array.isArray(userShelves)) userShelves = []
  const readShelf = userShelves.filter((shelf: any) => shelf.name === 'read')[0]
  
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

const getUpdatesFromResponse = (result: any): GoodreadsUpdate[] => {
  const rawUpdates = result?.GoodreadsResponse?.user?.updates?.update ?? []
  const isDefined = (subject: unknown) => Boolean(subject)
  const validateUpdate = (update: any) =>
    update && (update.type === 'userstatus' || update.type === 'review')

  // Ensure rawUpdates is always an array
  const updatesArray = Array.isArray(rawUpdates) ? rawUpdates : [rawUpdates]

  // Filter out undefined/null updates before checking type
  const updates = updatesArray
    .filter(isDefined)
    .filter(validateUpdate)
    .map((update) => transformUpdate(update))
    .filter((update): update is GoodreadsUpdate => Boolean(update))

  return updates
}

const fetchUser = async (): Promise<FetchUserResult> => {
  const { apiKey: key, userId: userID } = getGoodreadsConfig()
  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  return new Promise((resolve) => {
    parser.parseString(xml, (err: unknown, result: any) => {
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
