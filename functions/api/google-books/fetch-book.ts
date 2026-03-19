import { logger } from 'firebase-functions'
import got from 'got'

import { getGoogleBooksApiKey } from '../../config/backend-config.js'

import type {
  GoogleBooksFetchByIsbnInput,
  GoogleBooksFetchByIsbnResult,
  GoogleBooksVolumeSubset,
} from '../../types/google-books.js'

import {
  isGoogleBooksVolumesResponseSubset as isVolumesResponseSubset,
} from '../../types/google-books.js'

const fetchBook = async (
  book: GoogleBooksFetchByIsbnInput,
  maxRetries = 3,
): Promise<GoogleBooksFetchByIsbnResult | null> => {
  const { isbn, rating } = book
  const googleBooksAPIKey = getGoogleBooksApiKey()

  if (!isbn) {
    throw new Error(`ISBN number required to search Google Books. You passed: ${isbn}`)
  }

  const googleBooksVolumeURL = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${googleBooksAPIKey}&country=US`

  // Retry with exponential backoff on rate limit errors
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { body } = await got(googleBooksVolumeURL)
      const parsed: unknown = JSON.parse(body)
      const items = isVolumesResponseSubset(parsed)
        ? parsed.items
        : undefined
      const book: GoogleBooksVolumeSubset | undefined = items?.[0]

      if (!book) {
        logger.info(`No result from Google Books for ISBN: ${isbn}; title/author fallback may be used.`)
      }

      return {
        book,
        rating,
      }
    } catch (error) {
      const statusCode = error.response?.statusCode || error.statusCode
      const errorBody = error.response?.body ? JSON.parse(error.response.body) : null
      const isQuotaExceeded = errorBody?.error?.status === 'RESOURCE_EXHAUSTED' || 
                              errorBody?.error?.code === 429 && 
                              errorBody?.error?.message?.includes('Quota exceeded')
      
      // Don't retry on daily quota exceeded - it won't help
      if (isQuotaExceeded) {
        logger.error(`Daily quota exceeded for Google Books API. ISBN ${isbn} will not be fetched.`, {
          message: errorBody?.error?.message,
          quota_limit: errorBody?.error?.details?.[0]?.metadata?.quota_limit_value
        })
        return null
      }
      
      // Retry on 429 (rate limit) or 503 (Service Unavailable) - but not quota exceeded
      if ((statusCode === 429 || statusCode === 503) && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
        logger.warn(`Rate limited (${statusCode}) for ISBN ${isbn}, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For other errors or max retries reached, log and return null
      if (attempt === maxRetries) {
        logger.error(`Error fetching data Google Books API for ISBN ${isbn} after ${maxRetries} attempts.`, error)
        return null
      }
      
      // For non-rate-limit errors, don't retry
      logger.error('Error fetching data Google Books API.', error)
      return null
    }
  }

  return null
}

export default fetchBook
