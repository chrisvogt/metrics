import { logger } from 'firebase-functions'
import got from 'got'

const googleBooksAPIKey = process.env.GOOGLE_BOOKS_API_KEY

const fetchBook = async (book, maxRetries = 3) => {
  const { isbn, rating } = book

  if (!isbn) {
    throw new Error(`ISBN number required to search Google Books. You passed: ${isbn}`)
  }

  const googleBooksVolumeURL = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${googleBooksAPIKey}&country=US`

  // Retry with exponential backoff on rate limit errors
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { body } = await got(googleBooksVolumeURL)
      const { items: [book] = [] } = JSON.parse(body)

      if (!book) {
        logger.error(`No result returned from Google Books for ISBN: ${isbn}.`)
      }

      return {
        book,
        rating,
      }
    } catch (error) {
      const statusCode = error.response?.statusCode || error.statusCode
      
      // Retry on 429 (Too Many Requests) or 503 (Service Unavailable)
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
