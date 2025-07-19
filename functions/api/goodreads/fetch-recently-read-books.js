import { parseString } from 'xml2js'
import convertToHttps from 'to-https'
import get from 'lodash.get'
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

      const reviewsResponse = get(response, 'GoodreadsResponse.reviews[0].review', [])
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

        const [{
          description: [goodreadsDescription] = [],
          isbn: [isbn10] = [],
          isbn13: [isbn13] = [],
        }] = bookData  
        const isbn = isbn13 || isbn10
      
        if (Array.isArray(books) && isString(isbn)) {
          books.push({
            isbn,
            rating,
            goodreadsDescription,
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
  const bookPromises = bookReviews.map((book, index) => 
    fetchBookFromGoogle(book).then(result => ({ 
      googleBookResult: result, 
      goodreadsData: book,
      originalIndex: index 
    }))
  )
  const bookResults = await Promise.all(bookPromises)
  const books = bookResults
    .filter(
      (bookResult = {}) => Boolean(bookResult.googleBookResult) && Boolean(bookResult.googleBookResult.book)
    )
    .map(({ googleBookResult, goodreadsData }) => ({
      ...googleBookResult,
      goodreadsDescription: goodreadsData.goodreadsDescription
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
