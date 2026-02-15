import { parseString } from 'xml2js'
import convertToHttps from 'to-https'
import _ from 'lodash'
import got from 'got'
import isString from 'lodash.isstring'
import { logger } from 'firebase-functions'
import pMap from 'p-map'

import fetchAndUploadFile from '../cloud-storage/fetch-and-upload-file.js'
import fetchBookFromGoogle from '../google-books/fetch-book.js'
import listStoredMedia from '../cloud-storage/list-stored-media.js'

import {
  CLOUD_STORAGE_IMAGES_BUCKET,
  IMAGE_CDN_BASE_URL
} from '../../constants.js'

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
    goodreadsDescription,
    isbn,
  } = book

  const mediaDestinationPath = toBookMediaDestinationPath(id)

  return {
    authors,
    categories,
    cdnMediaURL: `${IMAGE_CDN_BASE_URL}${mediaDestinationPath}`,
    mediaDestinationPath: mediaDestinationPath,
    description: goodreadsDescription || description,
    id,
    infoLink: infoLink ? convertToHttps(infoLink) : '',
    isbn, // Include ISBN for matching updates to books
    pageCount,
    previewLink,
    rating,
    smallThumbnail: smallThumbnail ? convertToHttps(smallThumbnail) : '',
    subtitle,
    thumbnail: thumbnail ? convertToHttps(thumbnail) : '',
    title,
  }
}

export default async () => {
  const key = process.env.GOODREADS_API_KEY
  const userID = process.env.GOODREADS_USER_ID

  const { body } = await got(
    `https://www.goodreads.com/review/list/${userID}.xml?key=${key}&v=2&shelf=read&sort=date_read&per_page=100`
  )

  let rawReviewsResponse

  // Transforms Goodreads Book Reviews response from XML into JSON
  const bookReviews = await new Promise((resolve, reject) => {
    parseString(body, (error, response) => {
      if (error) {
        reject(error)
      }

      const reviewsResponse = _.get(response, 'GoodreadsResponse.reviews[0].review', [])
      const transformedReviews = reviewsResponse.reduce((books, book) => {
        const {
          read_at: [date],
        } = book
      
        if (!isString(date) && date.length > 3) {
          return books
        }
      
        const {
          book: bookData,
          rating: [rating],
        } = book

        const [firstBook = {}] = Array.isArray(bookData) ? bookData : [bookData]
        const [goodreadsDescription] = _.get(firstBook, 'description', [])
        const [isbn10] = _.get(firstBook, 'isbn', [])
        const [isbn13] = _.get(firstBook, 'isbn13', [])
        const isbn = isbn13 || isbn10
        const title = _.get(firstBook, 'title.0')
        const authorName = _.get(firstBook, 'authors.0.author.0.name.0')
      
        if (Array.isArray(books) && isString(isbn)) {
          books.push({
            isbn,
            rating,
            goodreadsDescription,
            ...(isString(title) && { title }),
            ...(isString(authorName) && { authorName }),
          })
        }
      
        return books
      }, [])

      rawReviewsResponse = reviewsResponse

      resolve(Array.isArray(transformedReviews) ? transformedReviews : [])
    })
  })

  // NOTE(chrisvogt): I'd like to eventually phase this out, or replace Goodreads
  // altogether. The Goodreads data is not very good, and is often lacking detailed
  // information. The Google Books data is really clean and useful. So, I'm currently
  // using Goodreads to get my book review, and then returning the book data from
  // Google Books.
  // Use pMap with concurrency control to avoid rate limiting
  const bookResults = await pMap(
    bookReviews,
    async (book, index) => {
      // Add a small delay between requests to avoid rate limiting (except for first request)
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay between requests
      }
      
      let result = await fetchBookFromGoogle(book)

      // If ISBN lookup failed, try searching by title and/or author
      if ((!result || !result.book) && book.title) {
        const searchQuery = book.authorName
          ? `intitle:${book.title} inauthor:${book.authorName}`
          : `intitle:${book.title}`
        const maxRetries = 3
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const googleBooksAPIKey = process.env.GOOGLE_BOOKS_API_KEY
            const { body } = await got('https://www.googleapis.com/books/v1/volumes', {
              searchParams: {
                q: searchQuery,
                key: googleBooksAPIKey,
                country: 'US'
              }
            })
            const { items: [foundBook] = [] } = JSON.parse(body)
            if (foundBook) {
              result = {
                book: foundBook,
                rating: book.rating,
              }
              logger.info(
                `Found book by ${book.authorName ? 'title/author' : 'title'} for recently read: ${book.title}`
              )
              break
            }
          } catch (error) {
            const statusCode = error.response?.statusCode || error.statusCode
            const errorBody = error.response?.body
              ? (typeof error.response.body === 'string' ? JSON.parse(error.response.body) : error.response.body)
              : null
            const isQuotaExceeded =
              errorBody?.error?.status === 'RESOURCE_EXHAUSTED' ||
              (errorBody?.error?.code === 429 && errorBody?.error?.message?.includes('Quota exceeded'))
            if (isQuotaExceeded) {
              logger.error(
                'Daily quota exceeded for Google Books API. Title/author fallback skipped.',
                { message: errorBody?.error?.message }
              )
              break
            }
            if ((statusCode === 429 || statusCode === 503) && attempt < maxRetries) {
              const waitTime = Math.pow(2, attempt) * 1000
              logger.warn(
                `Rate limited (${statusCode}) for title search "${book.title}", waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`
              )
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue
            }
            logger.error(
              `Error fetching book by ${book.authorName ? 'title/author' : 'title'} for recently read "${book.title}" after retries:`,
              error
            )
            break
          }
        }
      }

      if (!result || !result.book) {
        logger.warn(
          `Book not found by ISBN or title/author fallback: ${book.title ? `"${book.title}"` : `ISBN ${book.isbn}`}`
        )
      }

      return {
        googleBookResult: result,
        goodreadsData: book,
        originalIndex: index
      }
    },
    {
      concurrency: 3, // Limit concurrent requests to avoid rate limiting
      stopOnError: false,
    }
  )
  const books = bookResults
    .filter(
      (bookResult = {}) => Boolean(bookResult.googleBookResult) && Boolean(bookResult.googleBookResult.book)
    )
    .map(({ googleBookResult, goodreadsData }) => ({
      ...googleBookResult,
      goodreadsDescription: goodreadsData.goodreadsDescription,
      isbn: goodreadsData.isbn // Store ISBN for matching updates to books
    }))
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
    result = [] // Ensure result is always an array
  }

  logger.info('Goodreads data sync finished successfully with media uploads.', {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    totalUploadedCount: result?.length,
    uploadedFiles: result?.map(({ fileName }) => fileName),
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
