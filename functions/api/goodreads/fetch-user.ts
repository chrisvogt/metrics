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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object'

const getMaybeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return undefined
  const inner = value._
  return typeof inner === 'string' ? inner : undefined
}

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (!value) return []
  return [value]
}

const getProfileFromResponse = (result: unknown): GoodreadsProfile => {
  const empty: GoodreadsProfile = { readCount: 0 }
  if (!isRecord(result)) return empty

  const goodreadsResponse = result.GoodreadsResponse
  if (!isRecord(goodreadsResponse)) return empty

  const user = goodreadsResponse.user
  if (!isRecord(user)) return empty

  const userShelves = user.user_shelves
  const userShelfVal = isRecord(userShelves) ? userShelves.user_shelf : undefined
  const shelvesArray = asArray(userShelfVal)
  const readShelf = shelvesArray.find(
    shelf => isRecord(shelf) && shelf.name === 'read',
  ) as Record<string, unknown> | undefined

  const bookCountStr = getMaybeString(readShelf?.book_count) ?? ''
  const readCount = Number(bookCountStr) || 0

  return {
    name: getMaybeString(user.name),
    username: getMaybeString(user.user_name),
    link: getMaybeString(user.link),
    imageURL: getMaybeString(user.image_url),
    smallImageURL: getMaybeString(user.small_image_url),
    website: getMaybeString(user.website),
    joined: getMaybeString(user.joined),
    interests: getMaybeString(user.interests),
    favoriteBooks: getMaybeString(user.favorite_books),
    friendsCount: getMaybeString(user.friends_count),
    readCount,
  }
}

const getUpdatesFromResponse = (result: unknown): GoodreadsUpdate[] => {
  if (!isRecord(result)) return []

  const goodreadsResponse = result.GoodreadsResponse
  if (!isRecord(goodreadsResponse)) return []

  const user = goodreadsResponse.user
  if (!isRecord(user)) return []

  const updates = user.updates
  if (!isRecord(updates)) return []

  const rawUpdates = updates.update
  return asArray(rawUpdates)
    .map(update => transformUpdate(update))
    .filter((update): update is GoodreadsUpdate => Boolean(update))
}

const fetchUser = async (): Promise<FetchUserResult> => {
  const { apiKey: key, userId: userID } = getGoodreadsConfig()
  const goodreadsURL = `https://www.goodreads.com/user/show/${userID}?format=xml&key=${key}`

  const response = await got(goodreadsURL)
  const xml = response.body

  return new Promise((resolve) => {
    parser.parseString(xml, (err: unknown, result: unknown) => {
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
