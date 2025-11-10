import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import { Timestamp } from 'firebase-admin/firestore'
import convertToHttps from 'to-https'
import got from 'got'
import pMap from 'p-map'

import fetchUser from '../api/goodreads/fetch-user.js'
import fetchRecentlyReadBooks from '../api/goodreads/fetch-recently-read-books.js'
import generateGoodreadsSummary from '../api/goodreads/generate-goodreads-summary.js'
import fetchBookFromGoogle from '../api/google-books/fetch-book.js'
import fetchAndUploadFile from '../api/cloud-storage/fetch-and-upload-file.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'
import { DATABASE_COLLECTION_GOODREADS, IMAGE_CDN_BASE_URL, CLOUD_STORAGE_IMAGES_BUCKET } from '../constants.js'

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
    isbn,
    pageCount,
    previewLink,
    rating,
    smallThumbnail: smallThumbnail ? convertToHttps(smallThumbnail) : '',
    subtitle,
    thumbnail: thumbnail ? convertToHttps(thumbnail) : '',
    title,
  }
}

const processUpdatesWithMedia = async (updates = [], books = []) => {
  if (!updates || updates.length === 0) {
    return updates
  }

  // Create a map of books by ISBN for quick lookup
  const booksByISBN = new Map()
  books.forEach(book => {
    // Get ISBN from book data (we store it in transformBookData)
    const isbn = book.isbn
    if (isbn && typeof isbn === 'string') {
      // Store by both with and without dashes for matching
      booksByISBN.set(isbn, book)
      booksByISBN.set(isbn.replace(/-/g, ''), book)
    }
  })

  // Find updates that need book data fetched
  const updatesNeedingBooks = []
  const updatesWithMedia = updates.map((update) => {
    // Get ISBN from the update's book
    let isbn = null
    if (update.type === 'userstatus' && update.book) {
      const isbn13 = update.book.isbn13
      const isbn10 = update.book.isbn
      // Handle case where isbn might be { nil: "true" } object
      isbn = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
    } else if (update.type === 'review' && update.book) {
      // Review updates might not have ISBN, but check anyway
      const isbn13 = update.book.isbn13
      const isbn10 = update.book.isbn
      isbn = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
    }

    // If we have ISBN, try to match with existing books
    if (isbn) {
      const matchingBook = booksByISBN.get(isbn) || booksByISBN.get(isbn.replace(/-/g, ''))
      if (matchingBook && matchingBook.cdnMediaURL) {
        // Book already exists, use its CDN URL
        const updateWithMedia = { ...update }
        updateWithMedia.cdnMediaURL = matchingBook.cdnMediaURL
        updateWithMedia.mediaDestinationPath = matchingBook.mediaDestinationPath
        return updateWithMedia
      }
    }

    // Book not found in existing books, need to fetch it
    // Include update even if no ISBN (will fetch by title/author)
    updatesNeedingBooks.push({ update, isbn })
    return update
  })

  // Fetch books for updates that don't have matching books
  // Deduplicate by ISBN or title to avoid fetching the same book multiple times
  if (updatesNeedingBooks.length > 0) {
    // Create a map of unique books to fetch (keyed by ISBN or title)
    const uniqueBooksToFetch = new Map()
    updatesNeedingBooks.forEach(({ update, isbn }) => {
      const book = update.book
      if (!book || !book.title) return
      
      // Use ISBN as key if available, otherwise use title
      const key = isbn ? `isbn:${isbn}` : `title:${book.title.toLowerCase().trim()}`
      
      if (!uniqueBooksToFetch.has(key)) {
        uniqueBooksToFetch.set(key, {
          update, // Store first update as reference
          isbn,
          book,
          updates: [] // Store all updates that need this book
        })
      }
      
      // Add this update to the list of updates needing this book
      uniqueBooksToFetch.get(key).updates.push(update)
    })
    
    // Fetch each unique book only once with concurrency control and delays to avoid rate limiting
    const fetchedBookResults = await pMap(
      Array.from(uniqueBooksToFetch.values()),
      async ({ update, isbn, book, updates }, index) => {
        // Add a small delay between requests to avoid rate limiting (except for first request)
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay between requests
        }
        
        let result = null
        
        // Helper function to fetch with retry and exponential backoff
        const fetchWithRetry = async (fetchFn, maxRetries = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              return await fetchFn()
            } catch (error) {
              const statusCode = error.response?.statusCode || error.statusCode
              const errorBody = error.response?.body ? (typeof error.response.body === 'string' ? JSON.parse(error.response.body) : error.response.body) : null
              const isQuotaExceeded = errorBody?.error?.status === 'RESOURCE_EXHAUSTED' || 
                                      (errorBody?.error?.code === 429 && 
                                       errorBody?.error?.message?.includes('Quota exceeded'))
              
              // Don't retry on daily quota exceeded - it won't help
              if (isQuotaExceeded) {
                logger.error('Daily quota exceeded for Google Books API. Book fetch will be skipped.', {
                  message: errorBody?.error?.message,
                  quota_limit: errorBody?.error?.details?.[0]?.metadata?.quota_limit_value
                })
                throw error // Re-throw to be caught by outer try/catch
              }
              
              // Retry on 429 (rate limit) or 503 (Service Unavailable) - but not quota exceeded
              if ((statusCode === 429 || statusCode === 503) && attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
                logger.warn(`Rate limited (${statusCode}) for book fetch, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
                await new Promise(resolve => setTimeout(resolve, waitTime))
                continue
              }
              
              // For other errors or max retries reached, throw
              throw error
            }
          }
        }
        
        // Try fetching by ISBN first (if available)
        if (isbn) {
          try {
            result = await fetchWithRetry(() => fetchBookFromGoogle({ isbn }))
          } catch (error) {
            logger.error(`Error fetching book by ISBN ${isbn} after retries:`, error)
            result = null
          }
        }
        
        // If ISBN search fails or no ISBN, try searching by title + author
        if (!result || !result.book) {
          if (book && book.title) {
            // Try to get author name - different structure for review vs userstatus updates
            const authorName = book.author?.name || book.author?.displayName || book.author?.sortName
            
            let searchQuery
            if (authorName) {
              // Search by title and author
              searchQuery = `intitle:${book.title} inauthor:${authorName}`
            } else {
              // Fallback: search by title only if no author name available
              searchQuery = `intitle:${book.title}`
            }
            
            try {
              const googleBooksAPIKey = process.env.GOOGLE_BOOKS_API_KEY
              result = await fetchWithRetry(async () => {
                const { body } = await got('https://www.googleapis.com/books/v1/volumes', {
                  searchParams: {
                    q: searchQuery,
                    key: googleBooksAPIKey,
                    country: 'US'
                  }
                })
                const { items: [foundBook] = [] } = JSON.parse(body)
                
                if (foundBook) {
                  return {
                    book: foundBook,
                    rating: null,
                  }
                }
                return null
              })
              
              if (result && result.book) {
                logger.info(`Found book by ${authorName ? 'title/author' : 'title'} for update: ${book.title}`)
              }
            } catch (error) {
              logger.error(`Error fetching book by ${authorName ? 'title/author' : 'title'} for ${book.title} after retries:`, error)
              result = null
            }
          }
        }
        
        return {
          googleBookResult: result,
          update, // Keep reference to first update for matching
          updates, // All updates that need this book
          isbn,
        }
      },
      {
        concurrency: 1, // Very low concurrency to avoid rate limiting (429 errors)
        stopOnError: false,
      }
    )
    
    // Extract ISBN from Google Books response if available, otherwise use the update's ISBN
    const fetchedBooksWithMetadata = fetchedBookResults
      .filter(({ googleBookResult }) => 
        Boolean(googleBookResult) && Boolean(googleBookResult.book)
      )
      .flatMap(({ googleBookResult, updates, isbn: updateISBN }) => {
        // Try to get ISBN from Google Books response first
        let isbn = updateISBN
        const volumeInfo = googleBookResult.book?.volumeInfo
        if (volumeInfo?.industryIdentifiers) {
          const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')
          const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10')
          isbn = isbn13?.identifier || isbn10?.identifier || updateISBN
        }
        
        const transformedBook = transformBookData({
          ...googleBookResult,
          isbn,
        })
        
        // Return one entry per update that needs this book
        return updates.map(updateRef => ({
          ...transformedBook,
          update: updateRef, // Each update gets its own reference
        }))
      })

    // Upload media for newly fetched books
    const storedMediaFileNames = await listStoredMedia()
    const mediaToDownload = fetchedBooksWithMetadata
      .filter(({ mediaDestinationPath, thumbnail }) => {
        if (!thumbnail) {
          return false
        }
        const isAlreadyDownloaded = storedMediaFileNames.includes(mediaDestinationPath)
        return !isAlreadyDownloaded
      })
      .map(({ id, mediaDestinationPath, thumbnail }) => ({
        destinationPath: mediaDestinationPath,
        id,
        mediaURL: thumbnail,
      }))

    if (mediaToDownload.length > 0) {
      try {
        await pMap(mediaToDownload, fetchAndUploadFile, {
          concurrency: 10,
          stopOnError: false,
        })
        logger.info('Goodreads updates book media upload finished.', {
          destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
          totalUploadedCount: mediaToDownload.length,
          uploadedFiles: mediaToDownload.map(({ destinationPath }) => destinationPath),
        })
      } catch (error) {
        logger.error('Something went wrong fetching and uploading update book media files.', error)
      }
    }

    // Create a map of fetched books by update reference, link, ISBN, and title for matching
    const fetchedBooksByUpdate = new Map()
    const fetchedBooksByLink = new Map()
    const fetchedBooksByISBN = new Map()
    const fetchedBooksByTitle = new Map()
    
    fetchedBooksWithMetadata.forEach(book => {
      // Map by update object reference (most reliable for exact matches)
      if (book.update) {
        fetchedBooksByUpdate.set(book.update, book)
      }
      // Also map by update link (unique identifier)
      if (book.update && book.update.link) {
        fetchedBooksByLink.set(book.update.link, book)
      }
      // Map by ISBN from Google Books response
      if (book.isbn) {
        const isbnStr = String(book.isbn)
        fetchedBooksByISBN.set(isbnStr, book)
        fetchedBooksByISBN.set(isbnStr.replace(/-/g, ''), book)
      }
      // Also map by the update's original ISBN (in case it differs from Google Books)
      if (book.update) {
        let updateISBN = null
        if (book.update.type === 'userstatus' && book.update.book) {
          const isbn13 = book.update.book.isbn13
          const isbn10 = book.update.book.isbn
          updateISBN = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
        } else if (book.update.type === 'review' && book.update.book) {
          const isbn13 = book.update.book.isbn13
          const isbn10 = book.update.book.isbn
          updateISBN = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
        }
        if (updateISBN && String(updateISBN) !== String(book.isbn)) {
          fetchedBooksByISBN.set(String(updateISBN), book)
          fetchedBooksByISBN.set(String(updateISBN).replace(/-/g, ''), book)
        }
      }
      // Also map by title for cases where ISBN is missing (like review updates)
      if (book.title) {
        const titleKey = book.title.toLowerCase().trim()
        fetchedBooksByTitle.set(titleKey, book)
      }
    })

    // Update updates with fetched book data
    return updatesWithMedia.map((update) => {
      if (update.cdnMediaURL) {
        // Already has media from existing books
        return update
      }

      // Try to match by update object reference first (most reliable)
      let fetchedBook = fetchedBooksByUpdate.get(update)
      
      // Fallback to link matching
      if (!fetchedBook && update.link) {
        fetchedBook = fetchedBooksByLink.get(update.link)
      }
      
      // Fallback to ISBN matching
      if (!fetchedBook) {
        let isbn = null
        if (update.type === 'userstatus' && update.book) {
          const isbn13 = update.book.isbn13
          const isbn10 = update.book.isbn
          isbn = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
        } else if (update.type === 'review' && update.book) {
          const isbn13 = update.book.isbn13
          const isbn10 = update.book.isbn
          isbn = (isbn13 && typeof isbn13 === 'string') ? isbn13 : ((isbn10 && typeof isbn10 === 'string') ? isbn10 : null)
        }

        if (isbn) {
          const isbnStr = String(isbn)
          fetchedBook = fetchedBooksByISBN.get(isbnStr) || fetchedBooksByISBN.get(isbnStr.replace(/-/g, ''))
        }
      }
      
      // Fallback to title matching (for review updates without ISBN)
      if (!fetchedBook && update.book && update.book.title) {
        const titleKey = update.book.title.toLowerCase().trim()
        fetchedBook = fetchedBooksByTitle.get(titleKey)
      }

      if (fetchedBook && fetchedBook.cdnMediaURL) {
        const updateWithMedia = { ...update }
        updateWithMedia.cdnMediaURL = fetchedBook.cdnMediaURL
        updateWithMedia.mediaDestinationPath = fetchedBook.mediaDestinationPath
        return updateWithMedia
      }

      return update
    })
  }

  return updatesWithMedia
}

const fetchAllGoodreadsPromises = async () => {
  try {
    const [user = {}, recentlyRead = {}] = await Promise.all([
      fetchUser(),
      fetchRecentlyReadBooks(),
    ])

    // Process updates to add media URLs by matching to books
    const processedUpdates = await processUpdatesWithMedia(user.updates, recentlyRead.books || [])

    return {
      collections: {
        recentlyReadBooks: recentlyRead.books.slice(0, 18),
        updates: processedUpdates
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
      saveWidgetContent(),
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
