const { parseString } = require('xml2js')
const convertToHttps = require('to-https')
const get = require('lodash/get')
const got = require('got')
const isArray = require('lodash/isArray')
const isString = require('lodash/isString')
const { logger } = require('firebase-functions')
const pMap = require('p-map')

const fetchAndUploadFile = require('../cloud-storage/fetch-and-upload-file')
const fetchBookFromGoogle = require('../google-books/fetch-book')
const listStoredMedia = require('../cloud-storage/list-stored-media')

const {
  CLOUD_STORAGE_IMAGES_BUCKET,
  IMAGE_CDN_BASE_URL
} = require('../../constants')

const toBookMediaDestinationPath = id => `books/${id}-thumbnail.jpg`

const transformBookData = (book) => {
  const {
    book: {
      id,
      volumeInfo: {
        authors,
        categories = [],
        description,
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

  const mediaDestinationPath = toBookMediaDestinationPath(id)

  return {
    authors,
    categories,
    cdnMediaURL: `${IMAGE_CDN_BASE_URL}${mediaDestinationPath}`,
    mediaDestinationPath: mediaDestinationPath,
    description,
    id,
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
  const key = process.env.GOODREADS_API_KEY
  const userID = process.env.GOODREADS_USER_ID

  const { body } = await got(
    `https://www.goodreads.com/review/list/${userID}.xml?key=${key}&v=2&shelf=read&sort=date_read&per_page=18`
  )

  let rawReviewsResponse

  // Transforms Goodreads Book Reviews response from XML into JSON
  const bookReviews = await new Promise((resolve, reject) => {
    parseString(body, (error, response) => {
      if (error) {
        reject(error)
      }

      const reviewsResponse = get(response, 'GoodreadsResponse.reviews[0].review', [])
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
  const bookPromises = bookReviews.map((book) => fetchBookFromGoogle(book))
  const bookResults = await Promise.all(bookPromises)
  const books = bookResults
    .filter(
      (bookResult = {}) => Boolean(bookResult) && Boolean(bookResult.book)
    )
    .map(transformBookData)

  const storedMediaFileNames = await listStoredMedia()

  // TODO: update the filters to use the same source of truth as data being saved
  // to the db.
  const mediaToDownload = books
    .filter(({ mediaDestinationPath, thumbnail }) => {
      if (!thumbnail) {
        return // I've found at least 1 book that doesn't contain a thumbnail
      }
      const isAlreadyDownloaded = storedMediaFileNames.includes(mediaDestinationPath)
      return !isAlreadyDownloaded
    })
    .map(({ id, mediaDestinationPath, thumbnail }) => ({
      destinationPath: mediaDestinationPath,
      id,
      mediaURL: thumbnail,
    }))

  if (!mediaToDownload.length) {
    logger.info('Goodreads data sync finished successfully without media uploads.', {
      destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
      totalUploadedCount: 0,
      uploadedFiles: [],
    })
    return {
      books,
      rawReviewsResponse,
      result: 'SUCCESS',
      totalUploadedCount: 0,
      uploadedFiles: [],
    }
  }

  let result
  try {
    result = await pMap(mediaToDownload, fetchAndUploadFile, {
      concurrency: 10,
      stopOnError: false,
    })
  } catch (error) {
    logger.error('Something went wrong fetching and uploading one or more media files.', error)
  }

  logger.info('Goodreads data sync finished successfully with media uploads.', {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    totalUploadedCount: result?.length,
    uploadedFiles: result.map(({ fileName }) => fileName),
  })

  return {
    books,
    rawReviewsResponse,
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    result: 'SUCCESS',
    totalUploadedCount: result?.length,
    uploadedFiles: result?.map(({ fileName }) => fileName),
  }
}
