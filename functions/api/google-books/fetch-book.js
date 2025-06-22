import { logger } from 'firebase-functions'
import got from 'got'

const googleBooksAPIKey = process.env.GOOGLE_BOOKS_API_KEY

const fetchBook = async (book) => {
  const { isbn, rating } = book

  if (!isbn) {
    throw new Error(`ISBN number required to search Google Books. You passed: ${isbn}`)
  }

  const googleBooksVolumeURL = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${googleBooksAPIKey}&country=US`

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
    logger.error('Error fetching data Google Books API.', error)
    return null
  }
}

export default fetchBook
