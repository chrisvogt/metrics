import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { Timestamp } from 'firebase-admin/firestore'

import fetchUser from '../api/goodreads/fetch-user.js'
import fetchRecentlyReadBooks from '../api/goodreads/fetch-recently-read-books.js'
import generateGoodreadsSummary from '../api/goodreads/generate-goodreads-summary.js'
import { DATABASE_COLLECTION_GOODREADS } from '../constants.js'

const fetchAllGoodreadsPromises = async () => {
  try {
    const [user = {}, recentlyRead = {}] = await Promise.all([
      fetchUser(),
      fetchRecentlyReadBooks(),
    ])

    return {
      collections: {
        recentlyReadBooks: recentlyRead.books.slice(0, 18),
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
      synced: Timestamp.now(),
    },
    profile,
  }

  // Generate AI summary using Gemini
  let aiSummary = null
  try {
    aiSummary = await generateGoodreadsSummary(widgetContent)
    widgetContent.aiSummary = aiSummary
  } catch (error) {
    logger.error('Failed to generate Goodreadsn AI summary:', error)
    // Continue with sync even if AI summary fails
  }

  const db = admin.firestore()

  const saveUserResponse = async () => await db
    .collection(DATABASE_COLLECTION_GOODREADS)
    .doc('last-response_user-show')
    .set({
      response: responses.user,
      updated: Timestamp.now(),
    })

  const saveBookReviews = async () => await db
    .collection(DATABASE_COLLECTION_GOODREADS)
    .doc('last-response_book-reviews')
    .set({
      response: responses.reviews,
      updated: Timestamp.now(),
    })

  const saveWidgetContent = async () => await db
    .collection(DATABASE_COLLECTION_GOODREADS)
    .doc('widget-content')
    .set(widgetContent)

  const saveAISummary = async () => {
    if (aiSummary) {
      await db
        .collection(DATABASE_COLLECTION_GOODREADS)
        .doc('last-response_ai-summary')
        .set({
          summary: aiSummary,
          generatedAt: Timestamp.now(),
        })
    }
  }

  try {
    await Promise.all([
      saveUserResponse(),
      saveBookReviews(),
      // saveWidgetContent(),
      saveAISummary(),
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

export default syncGoodreadsData
