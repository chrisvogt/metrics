const convertToHttps = require('to-https')
const fetchBookFromGoogle = require('../google-books/fetch-book')
const functions = require('firebase-functions')
const get = require('lodash/get')
const got = require('got')
const isArray = require('lodash/isArray')
const isString = require('lodash/isString')
const { parseString } = require('xml2js')

const transformBookData = book => {
  const {
    book: {
      volumeInfo: {
        authors,
        categories = [],
        imageLinks: { smallThumbnail = '', thumbnail = '' } = {},
        infoLink = '',
        pageCount,
        previewLink,
        subtitle,
        title,
      } = {},
    } = {},
    rating,
  } = book

  return {
    authors,
    categories,
    infoLink: infoLink ? convertToHttps(infoLink) : '',
    pageCount,
    previewLink,
    rating,
    smallThumbnail: smallThumbnail ? convertToHttps(smallThumbnail) : '',
    subtitle,
    thumbnail: thumbnail ? convertToHttps(thumbnail) : '',
    title,
  }
}

module.exports = async () => {
  const config = functions.config()
  const { goodreads: { key, user_id: userID } = {} } = config

  const { body } = await got(
    `https://www.goodreads.com/review/list/${userID}.xml?key=${key}&v=2&shelf=read&sort=date_read&per_page=18`
  )

  let rawReviewsResponse

  /**
   * Transforms Goodreads Book Reviews response from XML into JSON
   */
  const bookReviews = await new Promise((resolve, reject) => {
    parseString(body, (error, response) => {
      if (error) {
        reject(error)
      }

      const reviewsResponse = get(
        response,
        'GoodreadsResponse.reviews[0].review',
        []
      )
      const transformedReviews = reviewsResponse.reduce((books, book) => {
        const {
          read_at: [date],
        } = book

        if (!isString(date) && date.length > 3) {
          return
        }

        const {
          book: bookData,
          rating: [rating],
        } = book

        const [{ isbn: [isbn10] = [], isbn13: [isbn13] = [] }] = bookData
        const isbn = isbn13 || isbn10

        if (isArray(books) && isString(isbn)) {
          books.push({
            isbn,
            rating,
          })
        }

        return books
      }, [])

      rawReviewsResponse = reviewsResponse

      resolve(transformedReviews)
    })
  })

  // NOTE(chrisvogt): I'd like to eventually phase this out, or replace Goodreads
  // altogether. The Goodreads data is not very good, and is often lacking detailed
  // information. The Google Books data is really clean and useful. So, I'm currently
  // using Goodreads to get my book review, and then returning the book data from
  // Google Books.
  const bookPromises = bookReviews.map(book => fetchBookFromGoogle(book))
  const bookResults = await Promise.all(bookPromises)
  const books = bookResults
    .filter(
      (bookResult = {}) => Boolean(bookResult) && Boolean(bookResult.book)
    )
    .map(transformBookData)

  return { books, rawReviewsResponse }
}
