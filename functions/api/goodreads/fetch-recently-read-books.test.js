import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fetchRecentlyReadBooks from './fetch-recently-read-books.js'

// Mock dependencies
vi.mock('xml2js', () => ({
  parseString: vi.fn()
}))

vi.mock('got', () => ({
  default: vi.fn()
}))

vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../cloud-storage/fetch-and-upload-file.js', () => ({
  default: vi.fn()
}))

vi.mock('../google-books/fetch-book.js', () => ({
  default: vi.fn()
}))

vi.mock('../cloud-storage/list-stored-media.js', () => ({
  default: vi.fn()
}))

vi.mock('../../constants.js', () => ({
  CLOUD_STORAGE_IMAGES_BUCKET: 'test-bucket',
  IMAGE_CDN_BASE_URL: 'https://cdn.example.com/'
}))

vi.mock('p-map', () => ({
  default: vi.fn()
}))

describe('fetchRecentlyReadBooks', () => {
  let mockParseString
  let mockGot
  let mockFetchAndUploadFile
  let mockFetchBookFromGoogle
  let mockListStoredMedia
  let mockPMap
  let mockLogger

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock functions
    mockParseString = (await import('xml2js')).parseString
    mockGot = (await import('got')).default
    mockFetchAndUploadFile = (await import('../cloud-storage/fetch-and-upload-file.js')).default
    mockFetchBookFromGoogle = (await import('../google-books/fetch-book.js')).default
    mockListStoredMedia = (await import('../cloud-storage/list-stored-media.js')).default
    mockPMap = (await import('p-map')).default
    mockLogger = (await import('firebase-functions')).logger

    // Set up environment variables
    process.env.GOODREADS_API_KEY = 'test-api-key'
    process.env.GOODREADS_USER_ID = 'test-user-id'
  })

  afterEach(() => {
    delete process.env.GOODREADS_API_KEY
    delete process.env.GOODREADS_USER_ID
  })

  it('should fetch and transform book data successfully', async () => {
    // Mock Goodreads API response
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
              <isbn13>1234567890123</isbn13>
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    // Mock Google Books API response
    const mockGoogleBookData = {
      book: {
        id: 'test-book-id',
        volumeInfo: {
          authors: ['Test Author'],
          categories: ['Fiction'],
          description: 'Test description',
          imageLinks: {
            smallThumbnail: 'http://example.com/small.jpg',
            thumbnail: 'http://example.com/thumb.jpg'
          },
          infoLink: 'http://example.com/info',
          pageCount: 300,
          previewLink: 'http://example.com/preview',
          subtitle: 'Test Subtitle',
          title: 'Test Book Title'
        }
      },
      rating: '4'
    }

    // Mock stored media list
    const mockStoredMedia = ['books/other-book-thumbnail.jpg']

    // Setup mocks
    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                isbn: ['1234567890'],
                isbn13: ['1234567890123']
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookData)
    mockListStoredMedia.mockResolvedValue(mockStoredMedia)
    mockFetchAndUploadFile.mockResolvedValue({ fileName: 'books/test-book-id-thumbnail.jpg' })
    mockPMap.mockResolvedValue([{ fileName: 'books/test-book-id-thumbnail.jpg' }])

    const result = await fetchRecentlyReadBooks()

    // Verify Goodreads API was called
    expect(mockGot).toHaveBeenCalledWith(
      'https://www.goodreads.com/review/list/test-user-id.xml?key=test-api-key&v=2&shelf=read&sort=date_read&per_page=100'
    )

    // Verify XML parsing was called
    expect(mockParseString).toHaveBeenCalledWith(mockGoodreadsResponse, expect.any(Function))

    // Verify Google Books API was called
    expect(mockFetchBookFromGoogle).toHaveBeenCalledWith({
      isbn: '1234567890123',
      rating: '4'
    })

    // Verify stored media was checked
    expect(mockListStoredMedia).toHaveBeenCalled()

    // Verify media upload was attempted
    expect(mockPMap).toHaveBeenCalledWith(
      [{
        destinationPath: 'books/test-book-id-thumbnail.jpg',
        id: 'test-book-id',
        mediaURL: 'https://example.com/thumb.jpg'
      }],
      mockFetchAndUploadFile,
      {
        concurrency: 10,
        stopOnError: false
      }
    )

    // Verify result structure
    expect(result).toEqual({
      books: [{
        authors: ['Test Author'],
        categories: ['Fiction'],
        cdnMediaURL: 'https://cdn.example.com/books/test-book-id-thumbnail.jpg',
        mediaDestinationPath: 'books/test-book-id-thumbnail.jpg',
        description: 'Test description',
        id: 'test-book-id',
        infoLink: 'https://example.com/info',
        pageCount: 300,
        previewLink: 'http://example.com/preview',
        rating: '4',
        smallThumbnail: 'https://example.com/small.jpg',
        subtitle: 'Test Subtitle',
        thumbnail: 'https://example.com/thumb.jpg',
        title: 'Test Book Title'
      }],
      rawReviewsResponse: [{
        read_at: ['2023-01-01'],
        book: [{
          isbn: ['1234567890'],
          isbn13: ['1234567890123']
        }],
        rating: ['4']
      }],
      destinationBucket: 'test-bucket',
      result: 'SUCCESS',
      totalUploadedCount: 1,
      uploadedFiles: ['books/test-book-id-thumbnail.jpg']
    })

    // Verify success logging
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Goodreads data sync finished successfully with media uploads.',
      {
        destinationBucket: 'test-bucket',
        totalUploadedCount: 1,
        uploadedFiles: ['books/test-book-id-thumbnail.jpg']
      }
    )
  })

  it('should handle books without thumbnails', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    const mockGoogleBookData = {
      book: {
        id: 'test-book-id',
        volumeInfo: {
          authors: ['Test Author'],
          title: 'Test Book Title'
          // No imageLinks
        }
      },
      rating: '4'
    }

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                isbn: ['1234567890']
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookData)
    mockListStoredMedia.mockResolvedValue([])

    const result = await fetchRecentlyReadBooks()

    // Should not attempt to upload media for books without thumbnails
    expect(mockPMap).not.toHaveBeenCalled()
    expect(result.totalUploadedCount).toBe(0)
    expect(result.uploadedFiles).toEqual([])
  })

  it('should handle already downloaded media', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    const mockGoogleBookData = {
      book: {
        id: 'test-book-id',
        volumeInfo: {
          authors: ['Test Author'],
          title: 'Test Book Title',
          imageLinks: {
            thumbnail: 'http://example.com/thumb.jpg'
          }
        }
      },
      rating: '4'
    }

    // Mock that the media is already stored
    const mockStoredMedia = ['books/test-book-id-thumbnail.jpg']

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                isbn: ['1234567890']
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookData)
    mockListStoredMedia.mockResolvedValue(mockStoredMedia)

    const result = await fetchRecentlyReadBooks()

    // Should not attempt to upload already downloaded media
    expect(mockPMap).not.toHaveBeenCalled()
    expect(result.totalUploadedCount).toBe(0)
    expect(result.uploadedFiles).toEqual([])
  })

  it('should handle XML parsing errors', async () => {
    mockGot.mockResolvedValue({ body: 'invalid xml' })
    mockParseString.mockImplementation((xml, callback) => {
      callback(new Error('XML parsing failed'))
    })

    await expect(fetchRecentlyReadBooks()).rejects.toThrow('XML parsing failed')
  })

  it('should handle media upload errors gracefully', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    const mockGoogleBookData = {
      book: {
        id: 'test-book-id',
        volumeInfo: {
          authors: ['Test Author'],
          title: 'Test Book Title',
          imageLinks: {
            thumbnail: 'http://example.com/thumb.jpg'
          }
        }
      },
      rating: '4'
    }

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                isbn: ['1234567890']
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue(mockGoogleBookData)
    mockListStoredMedia.mockResolvedValue([])
    mockPMap.mockRejectedValue(new Error('Upload failed'))

    const result = await fetchRecentlyReadBooks()

    // Should handle upload errors gracefully
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Something went wrong fetching and uploading one or more media files.',
      expect.any(Error)
    )
    expect(result.totalUploadedCount).toBe(0)
    expect(result.uploadedFiles).toEqual([])
  })

  it('should filter out books with invalid read dates', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
            </book>
            <rating>4</rating>
          </review>
          <review>
            <read_at></read_at>
            <book>
              <isbn>0987654321</isbn>
            </book>
            <rating>3</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [
              {
                read_at: ['2023-01-01'],
                book: [{
                  isbn: ['1234567890']
                }],
                rating: ['4']
              },
              {
                read_at: [[1,2,3,4]], // Array, not a string, length > 3
                book: [{
                  isbn: ['0987654321']
                }],
                rating: ['3']
              }
            ]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue({
      book: {
        id: 'test-book-id',
        volumeInfo: {
          title: 'Test Book'
        }
      },
      rating: '4'
    })
    mockListStoredMedia.mockResolvedValue([])

    await fetchRecentlyReadBooks()

    // Should only process the book with valid date (the second one should be filtered out)
    expect(mockFetchBookFromGoogle).toHaveBeenCalledTimes(1)
    expect(mockFetchBookFromGoogle).toHaveBeenCalledWith({
      isbn: '1234567890',
      rating: '4'
    })
  })

  it('should handle books without ISBN', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <!-- No ISBN -->
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                // No ISBN fields
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockListStoredMedia.mockResolvedValue([])

    const result = await fetchRecentlyReadBooks()

    // Should not call Google Books API for books without ISBN
    expect(mockFetchBookFromGoogle).not.toHaveBeenCalled()
    expect(result.books).toEqual([])
  })

  it('should handle null or undefined Google Books results', async () => {
    const mockGoodreadsResponse = `
      <GoodreadsResponse>
        <reviews>
          <review>
            <read_at>2023-01-01</read_at>
            <book>
              <isbn>1234567890</isbn>
            </book>
            <rating>4</rating>
          </review>
        </reviews>
      </GoodreadsResponse>
    `

    mockGot.mockResolvedValue({ body: mockGoodreadsResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {
        GoodreadsResponse: {
          reviews: [{
            review: [{
              read_at: ['2023-01-01'],
              book: [{
                isbn: ['1234567890']
              }],
              rating: ['4']
            }]
          }]
        }
      })
    })
    mockFetchBookFromGoogle.mockResolvedValue(null) // No book data returned
    mockListStoredMedia.mockResolvedValue([])

    const result = await fetchRecentlyReadBooks()

    // Should filter out null results
    expect(result.books).toEqual([])
  })
}) 