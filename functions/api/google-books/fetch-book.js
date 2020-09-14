const { config, logger } = require('firebase-functions')
const got = require('got')

const fetchBook = async (book) => {
  const { isbn, rating } = book

  const { google: { books_api_key: apiKey } = {} } = config()

  const endpoint = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`

  let googleBookData
  try {
    const { body } = await got(endpoint)
    const { items: [bookData] = [] } = JSON.parse(body)

    if (!bookData) {
      throw new Error(`Failed to fetch Google Books data for ${isbn}.`)
    }

    googleBookData = bookData
  } catch (error) {
    logger.error('Error fetching book data from Google Books API.', {
      endpoint,
      error: error.message || error
    })
    return null
  }

  return {
    book: googleBookData,
    rating,
  }
}

module.exports = fetchBook
