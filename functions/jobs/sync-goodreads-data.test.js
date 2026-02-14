import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import syncGoodreadsData from './sync-goodreads-data.js'

// Use fake timers for retry/delay tests
vi.useFakeTimers()

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn()
        }))
      }))
    }))
  },
  firestore: {
    Timestamp: {
      now: vi.fn(() => new Timestamp(1640995200, 0))
    }
  }
}))

// Mock the API functions
vi.mock('../api/goodreads/fetch-user.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/goodreads/fetch-recently-read-books.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/goodreads/generate-goodreads-summary.js', () => ({
  default: vi.fn()
}))

vi.mock('p-map', () => ({
  default: vi.fn()
}))

vi.mock('../api/google-books/fetch-book.js', () => ({
  default: vi.fn()
}))

vi.mock('got', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/list-stored-media.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/fetch-and-upload-file.js', () => ({
  default: vi.fn()
}))

vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

import fetchUser from '../api/goodreads/fetch-user.js'
import fetchRecentlyReadBooks from '../api/goodreads/fetch-recently-read-books.js'
import generateGoodreadsSummary from '../api/goodreads/generate-goodreads-summary.js'

describe('syncGoodreadsData', () => {
  let mockSet
  let mockDoc
  let mockCollection
  let mockFirestore

  beforeEach(async () => {
    vi.clearAllMocks()
    
    mockSet = vi.fn()
    mockDoc = vi.fn(() => ({ set: mockSet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockFirestore = vi.fn(() => ({ collection: mockCollection }))
    
    admin.firestore = mockFirestore

    // Mock pMap to just execute the mapper function synchronously
    const pMapModule = await import('p-map')
    pMapModule.default.mockImplementation(async (items, mapper) => {
      const results = []
      for (const item of items) {
        results.push(await mapper(item))
      }
      return results
    })

    // Mock listStoredMedia to return empty array
    const listStoredMedia = await import('../api/cloud-storage/list-stored-media.js')
    listStoredMedia.default.mockResolvedValue([])
  })

  it('should successfully sync Goodreads data and save to database', async () => {
    const mockUserData = {
      profile: {
        displayName: 'Test User',
        profileURL: 'https://www.goodreads.com/user/show/123'
      },
      updates: [
        {
          id: 'update1',
          type: 'review',
          content: 'Great book!'
        }
      ],
      jsonResponse: { user: 'data' }
    }

    const mockRecentlyReadData = {
      books: [
        {
          id: 'book1',
          title: 'Test Book',
          author: 'Test Author',
          rating: 4
        }
      ],
      rawReviewsResponse: { reviews: 'data' }
    }

    const mockAISummary = '<p>Chris has been actively reading lately.</p>'

    fetchUser.mockResolvedValue(mockUserData)
    fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
    generateGoodreadsSummary.mockResolvedValue(mockAISummary)

    const result = await syncGoodreadsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.data.collections).toEqual({
      recentlyReadBooks: mockRecentlyReadData.books,
      updates: mockUserData.updates
    })
    expect(result.data.profile).toEqual(mockUserData.profile)
    expect(result.data.meta.synced).toBeInstanceOf(Timestamp)
    expect(result.data.aiSummary).toBe(mockAISummary)

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/goodreads')
    expect(mockDoc).toHaveBeenCalledWith('last-response_user-show')
    expect(mockDoc).toHaveBeenCalledWith('last-response_book-reviews')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockDoc).toHaveBeenCalledWith('last-response_ai-summary')
    expect(mockSet).toHaveBeenCalledTimes(4)
  })

  it('should handle API errors gracefully', async () => {
    fetchUser.mockRejectedValue(new Error('API Error'))
    fetchRecentlyReadBooks.mockResolvedValue({ books: [], rawReviewsResponse: {} })

    const result = await syncGoodreadsData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'API Error'
    })

    expect(mockSet).not.toHaveBeenCalled()
  })

  it('should handle database save errors', async () => {
    const mockUserData = {
      profile: { displayName: 'Test User' },
      updates: [],
      jsonResponse: {}
    }

    const mockRecentlyReadData = {
      books: [],
      rawReviewsResponse: {}
    }

    fetchUser.mockResolvedValue(mockUserData)
    fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
    mockSet.mockRejectedValue(new Error('Database Error'))

    const result = await syncGoodreadsData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Database Error'
    })
  })

  it('should handle partial API failures', async () => {
    fetchUser.mockResolvedValue({
      profile: { displayName: 'Test User' },
      updates: [],
      jsonResponse: {}
    })
    fetchRecentlyReadBooks.mockRejectedValue(new Error('Reviews API Error'))

    const result = await syncGoodreadsData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Reviews API Error'
    })
  })

  it('should continue sync even when AI summary generation fails', async () => {
    const mockUserData = {
      profile: { displayName: 'Test User' },
      updates: [],
      jsonResponse: { user: 'data' }
    }

    const mockRecentlyReadData = {
      books: [{ id: 'book1', title: 'Test Book' }],
      rawReviewsResponse: { reviews: 'data' }
    }

    fetchUser.mockResolvedValue(mockUserData)
    fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
    generateGoodreadsSummary.mockRejectedValue(new Error('AI API Error'))

    const result = await syncGoodreadsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.data.aiSummary).toBeUndefined()
    
    // Should still save other data
    expect(mockSet).toHaveBeenCalledTimes(3) // user, reviews, widget (no AI summary)
    expect(mockDoc).toHaveBeenCalledWith('last-response_user-show')
    expect(mockDoc).toHaveBeenCalledWith('last-response_book-reviews')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockDoc).not.toHaveBeenCalledWith('last-response_ai-summary')
  })

  it('should save AI summary separately when generated successfully', async () => {
    const mockUserData = {
      profile: { displayName: 'Test User' },
      updates: [],
      jsonResponse: { user: 'data' }
    }

    const mockRecentlyReadData = {
      books: [{ id: 'book1', title: 'Test Book' }],
      rawReviewsResponse: { reviews: 'data' }
    }

    const mockAISummary = '<p>AI generated summary</p>'

    fetchUser.mockResolvedValue(mockUserData)
    fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
    generateGoodreadsSummary.mockResolvedValue(mockAISummary)

    const result = await syncGoodreadsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.data.aiSummary).toBe(mockAISummary)
    
    // Verify AI summary was saved separately
    expect(mockDoc).toHaveBeenCalledWith('last-response_ai-summary')
    expect(mockSet).toHaveBeenCalledWith({
      summary: mockAISummary,
      generatedAt: expect.any(Timestamp)
    })
  })

  describe('processUpdatesWithMedia', () => {
    let mockFetchBookFromGoogle
    let mockGot
    let mockListStoredMedia
    let mockFetchAndUploadFile
    let mockPMap
    let mockLogger

    beforeEach(async () => {
      mockFetchBookFromGoogle = (await import('../api/google-books/fetch-book.js')).default
      mockGot = (await import('got')).default
      mockListStoredMedia = (await import('../api/cloud-storage/list-stored-media.js')).default
      mockFetchAndUploadFile = (await import('../api/cloud-storage/fetch-and-upload-file.js')).default
      mockPMap = (await import('p-map')).default
      mockLogger = (await import('firebase-functions')).logger

      // Set up environment variables
      process.env.GOOGLE_BOOKS_API_KEY = 'test-google-books-api-key'
    })

    it('should return empty updates unchanged', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates).toEqual([])
    })

    it('should match userstatus updates with existing books by ISBN13', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              isbn: '0143127551',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [
          {
            id: 'book1',
            isbn: '9780143127550',
            title: 'Test Book',
            cdnMediaURL: 'https://cdn.example.com/books/book1-thumbnail.jpg',
            mediaDestinationPath: 'books/book1-thumbnail.jpg'
          }
        ],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBe('https://cdn.example.com/books/book1-thumbnail.jpg')
      expect(result.data.collections.updates[0].mediaDestinationPath).toBe('books/book1-thumbnail.jpg')
    })

    it('should match userstatus updates with existing books by ISBN10 when ISBN13 not available', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: { nil: 'true' }, // nil object
              isbn: '0143127551',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [
          {
            id: 'book1',
            isbn: '0143127551',
            title: 'Test Book',
            cdnMediaURL: 'https://cdn.example.com/books/book1-thumbnail.jpg',
            mediaDestinationPath: 'books/book1-thumbnail.jpg'
          }
        ],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBe('https://cdn.example.com/books/book1-thumbnail.jpg')
    })

    it('should match review updates with existing books by ISBN', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [
          {
            id: 'book1',
            isbn: '9780143127550',
            title: 'Test Book',
            cdnMediaURL: 'https://cdn.example.com/books/book1-thumbnail.jpg',
            mediaDestinationPath: 'books/book1-thumbnail.jpg'
          }
        ],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBe('https://cdn.example.com/books/book1-thumbnail.jpg')
    })

    it('should match books by ISBN without dashes', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '978-0-14-312755-0', // with dashes
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [
          {
            id: 'book1',
            isbn: '9780143127550', // without dashes
            title: 'Test Book',
            cdnMediaURL: 'https://cdn.example.com/books/book1-thumbnail.jpg',
            mediaDestinationPath: 'books/book1-thumbnail.jpg'
          }
        ],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBe('https://cdn.example.com/books/book1-thumbnail.jpg')
    })

    it('should fetch book from Google Books API when not in existing books', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [], // No existing books
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            authors: ['Test Author'],
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            },
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780143127550' }
            ]
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      // Mock pMap to execute the mapper function
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockFetchBookFromGoogle).toHaveBeenCalledWith({ isbn: '9780143127550' })
    })

    it('should search by title and author when ISBN search fails', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book',
              author: { name: 'Test Author' }
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleSearchResponse = {
        items: [{
          id: 'search-result-id',
          volumeInfo: {
            title: 'Test Book',
            authors: ['Test Author'],
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        }]
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null) // ISBN search fails
      mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleSearchResponse) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should have attempted title/author search
      expect(mockGot).toHaveBeenCalledWith('https://www.googleapis.com/books/v1/volumes', {
        searchParams: {
          q: 'intitle:Test Book inauthor:Test Author',
          key: 'test-google-books-api-key',
          country: 'US'
        }
      })
    })

    it('should search by title only when author is not available', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
              // No author
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleSearchResponse = {
        items: [{
          id: 'search-result-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        }]
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleSearchResponse) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockGot).toHaveBeenCalledWith('https://www.googleapis.com/books/v1/volumes', {
        searchParams: {
          q: 'intitle:Test Book',
          key: 'test-google-books-api-key',
          country: 'US'
        }
      })
    })

    it('should handle author with displayName property', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book',
              author: { displayName: 'Display Author' }
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify({ items: [] }) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockGot).toHaveBeenCalledWith('https://www.googleapis.com/books/v1/volumes', {
        searchParams: {
          q: 'intitle:Test Book inauthor:Display Author',
          key: 'test-google-books-api-key',
          country: 'US'
        }
      })
    })

    it('should handle author with sortName property', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book',
              author: { sortName: 'Author, Sort' }
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify({ items: [] }) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockGot).toHaveBeenCalledWith('https://www.googleapis.com/books/v1/volumes', {
        searchParams: {
          q: 'intitle:Test Book inauthor:Author, Sort',
          key: 'test-google-books-api-key',
          country: 'US'
        }
      })
    })

    it('should upload book media for newly fetched books', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            link: 'https://goodreads.com/update/1',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            authors: ['Test Author'],
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            },
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780143127550' }
            ]
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([]) // No existing media
      mockFetchAndUploadFile.mockResolvedValue({ fileName: 'books/google-book-id-thumbnail.jpg' })
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should have called pMap for media upload
      expect(mockPMap).toHaveBeenCalled()
    })

    it('should skip media upload for already downloaded media', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            link: 'https://goodreads.com/update/1',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue(['books/google-book-id-thumbnail.jpg']) // Already exists
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // fetchAndUploadFile should not be called since media already exists
      expect(mockFetchAndUploadFile).not.toHaveBeenCalled()
    })

    it('should handle media upload errors gracefully', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            link: 'https://goodreads.com/update/1',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      let pMapCallCount = 0
      mockPMap.mockImplementation(async (items, mapper) => {
        pMapCallCount++
        if (pMapCallCount === 1) {
          // First call: book fetching
          const results = []
          for (let i = 0; i < items.length; i++) {
            const result = await mapper(items[i], i)
            results.push(result)
          }
          return results
        } else {
          // Second call: media upload - throw error
          throw new Error('Upload failed')
        }
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Something went wrong fetching and uploading update book media files.',
        expect.any(Error)
      )
    })

    it('should skip updates without title for book fetching', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550'
              // No title
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should not attempt title search without title
      expect(mockGot).not.toHaveBeenCalled()
    })

    it('should deduplicate book fetches for multiple updates with same ISBN', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          },
          {
            id: 'update2',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550', // Same ISBN
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should only fetch once for deduplicated ISBN
      expect(mockFetchBookFromGoogle).toHaveBeenCalledTimes(1)
    })

    it('should deduplicate book fetches by title when no ISBN', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              title: 'Test Book'
              // No ISBN
            }
          },
          {
            id: 'update2',
            type: 'userstatus',
            book: {
              title: 'Test Book' // Same title
              // No ISBN
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify({ items: [] }) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should only search once for deduplicated title
      expect(mockGot).toHaveBeenCalledTimes(1)
    })

    it('should handle rate limit errors with retry', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const rateLimitError = {
        response: {
          statusCode: 429,
          body: JSON.stringify({ error: { message: 'Rate limit exceeded' } })
        }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
    })

    it('should handle quota exceeded errors without retry', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const quotaExceededError = {
        response: {
          statusCode: 429,
          body: JSON.stringify({
            error: {
              code: 429,
              status: 'RESOURCE_EXHAUSTED',
              message: 'Quota exceeded for quota metric',
              details: [{ metadata: { quota_limit_value: '1000' } }]
            }
          })
        }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockRejectedValue(quotaExceededError)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Daily quota exceeded for Google Books API. Book fetch will be skipped.',
        expect.objectContaining({
          message: 'Quota exceeded for quota metric'
        })
      )
    })

    it('should match updates to fetched books by link', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            link: 'https://goodreads.com/update/unique-link',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })

    it('should match updates to fetched books by title fallback', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review', // Review type without ISBN
            book: {
              title: 'Unique Test Book Title'
              // No ISBN
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleSearchResponse = {
        items: [{
          id: 'search-result-id',
          volumeInfo: {
            title: 'Unique Test Book Title',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        }]
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleSearchResponse) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })

    it('should handle books without thumbnails', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book'
            // No imageLinks
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should not attempt media upload for books without thumbnails
      expect(mockFetchAndUploadFile).not.toHaveBeenCalled()
    })

    it('should handle title search errors gracefully', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book',
              author: { name: 'Test Author' }
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockRejectedValue(new Error('Network error'))
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching book by title/author'),
        expect.any(Error)
      )
    })

    it('should extract ISBN from Google Books industryIdentifiers', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            },
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780143127550' },
              { type: 'ISBN_10', identifier: '0143127551' }
            ]
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
    })

    it('should handle review update types with ISBN10', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review',
            book: {
              isbn13: null,
              isbn: '0143127551', // ISBN10
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [
          {
            id: 'book1',
            isbn: '0143127551',
            title: 'Test Book',
            cdnMediaURL: 'https://cdn.example.com/books/book1-thumbnail.jpg',
            mediaDestinationPath: 'books/book1-thumbnail.jpg'
          }
        ],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBe('https://cdn.example.com/books/book1-thumbnail.jpg')
    })

    it('should handle updates without book property', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus'
            // No book property
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
    })

    it('should handle 503 service unavailable with retry', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const serviceUnavailableError = {
        response: {
          statusCode: 503,
          body: JSON.stringify({ error: { message: 'Service temporarily unavailable' } })
        }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle
        .mockRejectedValueOnce(serviceUnavailableError)
        .mockResolvedValueOnce(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
    })

    it('should log book found by title/author search', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book',
              author: { name: 'Test Author' }
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleSearchResponse = {
        items: [{
          id: 'search-result-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        }]
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null) // ISBN search fails
      mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleSearchResponse) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Found book by title/author for update')
      )
    })

    it('should handle null updates', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: null, // null updates
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)

      const result = await syncGoodreadsData()

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates).toBeNull()
    })

    it('should handle ISBN search error gracefully and continue', async () => {
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockRejectedValue(new Error('API Error'))
      mockGot.mockResolvedValue({ body: JSON.stringify({ items: [] }) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching book by ISBN'),
        expect.any(Error)
      )
    })

    it('should fallback to link matching when update reference not found', async () => {
      // This tests line 368-369: fallback to link matching
      const updateWithLink = {
        id: 'update1',
        type: 'userstatus',
        link: 'https://goodreads.com/update/unique-link-123',
        book: {
          isbn13: '9780143127550',
          title: 'Test Book'
        }
      }

      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [updateWithLink],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      // Mock pMap to return results that will need link-based matching
      // The key is that the update object reference changes during the process
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      // Should have CDN URL from the fetched book matched by link
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })

    it('should fallback to ISBN matching for review updates in final matching phase', async () => {
      // This tests lines 379-382: review type ISBN fallback in final matching
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review', // Review type
            book: {
              isbn13: '9780143127550',
              isbn: '0143127551',
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [], // No existing books to match initially
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            },
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780143127550' }
            ]
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })

    it('should use ISBN10 for review updates when ISBN13 is not a string', async () => {
      // This tests lines 379-382 specifically with ISBN10 fallback
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review',
            book: {
              isbn13: { nil: 'true' }, // Not a string
              isbn: '0143127551', // Valid ISBN10 string
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
    })

    it('should handle review updates without ISBN in final matching (title fallback)', async () => {
      // This ensures the title fallback works for review updates without ISBN
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'review',
            book: {
              // No isbn13 or isbn
              title: 'Unique Book Title For Testing'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleSearchResponse = {
        items: [{
          id: 'search-result-id',
          volumeInfo: {
            title: 'Unique Book Title For Testing',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            }
          }
        }]
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(null)
      mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleSearchResponse) })
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })

    it('should handle different ISBN in update vs Google Books response', async () => {
      // Tests line 344-347: mapping by both update ISBN and Google Books ISBN
      const mockUserData = {
        profile: { displayName: 'Test User' },
        updates: [
          {
            id: 'update1',
            type: 'userstatus',
            book: {
              isbn13: '9780143127550', // Update has this ISBN
              title: 'Test Book'
            }
          }
        ],
        jsonResponse: { user: 'data' }
      }

      const mockRecentlyReadData = {
        books: [],
        rawReviewsResponse: { reviews: 'data' }
      }

      const mockGoogleBookResult = {
        book: {
          id: 'google-book-id',
          volumeInfo: {
            title: 'Test Book',
            imageLinks: {
              thumbnail: 'http://books.google.com/thumb.jpg'
            },
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9781234567890' } // Different ISBN from Google
            ]
          }
        },
        rating: null
      }

      fetchUser.mockResolvedValue(mockUserData)
      fetchRecentlyReadBooks.mockResolvedValue(mockRecentlyReadData)
      mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookResult)
      mockListStoredMedia.mockResolvedValue([])
      
      mockPMap.mockImplementation(async (items, mapper) => {
        const results = []
        for (let i = 0; i < items.length; i++) {
          const result = await mapper(items[i], i)
          results.push(result)
        }
        return results
      })

      const resultPromise = syncGoodreadsData()
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result.result).toBe('SUCCESS')
      expect(result.data.collections.updates[0].cdnMediaURL).toBeDefined()
    })
  })
}) 