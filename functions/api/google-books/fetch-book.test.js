import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('got', () => ({
  default: vi.fn()
}))

vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn()
  }
}))

let fetchBook

describe('fetchBook', () => {
  let mockGot
  let mockLogger

  beforeEach(async () => {
    // Set up environment variable before importing fetchBook
    process.env.GOOGLE_BOOKS_API_KEY = 'test-google-books-api-key'
    fetchBook = (await import('./fetch-book.js')).default

    // Clear all mocks
    vi.clearAllMocks()

    // Get mock functions
    const got = await import('got')
    mockGot = got.default
    mockLogger = (await import('firebase-functions')).logger
  })

  afterEach(() => {
    delete process.env.GOOGLE_BOOKS_API_KEY
    vi.restoreAllMocks()
  })

  it('should successfully fetch book data with valid ISBN', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '4'
    }

    const mockGoogleBooksResponse = {
      items: [
        {
          id: 'test-book-id',
          volumeInfo: {
            title: 'Test Book Title',
            subtitle: 'Test Subtitle',
            authors: ['Test Author'],
            description: 'Test description',
            pageCount: 300,
            categories: ['Fiction'],
            imageLinks: {
              smallThumbnail: 'https://example.com/small.jpg',
              thumbnail: 'https://example.com/thumb.jpg'
            },
            infoLink: 'https://example.com/info',
            previewLink: 'https://example.com/preview'
          }
        }
      ]
    }

    mockGot.mockResolvedValue({ body: JSON.stringify(mockGoogleBooksResponse) })

    const result = await fetchBook(bookInput)

    // Verify got was called with correct URL
    expect(mockGot).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780143127550&key=test-google-books-api-key&country=US'
    )

    // Verify result structure
    expect(result).toEqual({
      book: mockGoogleBooksResponse.items[0],
      rating: '4'
    })
  })

  it('should throw error when ISBN is missing', async () => {
    const bookInput = {
      isbn: null,
      rating: '4'
    }

    await expect(fetchBook(bookInput)).rejects.toThrow('ISBN number required to search Google Books. You passed: null')
  })

  it('should throw error when ISBN is undefined', async () => {
    const bookInput = {
      isbn: undefined,
      rating: '4'
    }

    await expect(fetchBook(bookInput)).rejects.toThrow('ISBN number required to search Google Books. You passed: undefined')
  })

  it('should throw error when ISBN is empty string', async () => {
    const bookInput = {
      isbn: '',
      rating: '4'
    }

    await expect(fetchBook(bookInput)).rejects.toThrow('ISBN number required to search Google Books. You passed: ')
  })

  it('should handle empty items array from Google Books API', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '4'
    }

    const mockEmptyResponse = {
      items: []
    }

    mockGot.mockResolvedValue({ body: JSON.stringify(mockEmptyResponse) })

    const result = await fetchBook(bookInput)

    // Should log error but return object with undefined book
    expect(mockLogger.error).toHaveBeenCalledWith('No result returned from Google Books for ISBN: 9780143127550.')
    expect(result).toEqual({
      book: undefined,
      rating: '4'
    })
  })

  it('should handle missing items property from Google Books API', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '4'
    }

    const mockResponseWithoutItems = {
      // Missing items property
      totalItems: 0
    }

    mockGot.mockResolvedValue({ body: JSON.stringify(mockResponseWithoutItems) })

    const result = await fetchBook(bookInput)

    // Should log error but return object with undefined book
    expect(mockLogger.error).toHaveBeenCalledWith('No result returned from Google Books for ISBN: 9780143127550.')
    expect(result).toEqual({
      book: undefined,
      rating: '4'
    })
  })

  it('should handle network errors from Google Books API', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '4'
    }

    const mockError = new Error('Network error')
    mockGot.mockRejectedValue(mockError)

    const result = await fetchBook(bookInput)

    // Should log error and return null
    expect(mockLogger.error).toHaveBeenCalledWith('Error fetching data Google Books API.', mockError)
    expect(result).toBeNull()
  })

  it('should handle malformed JSON response', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '4'
    }

    const malformedJson = '{ invalid json }'
    mockGot.mockResolvedValue({ body: malformedJson })

    const result = await fetchBook(bookInput)

    // Should log error and return null due to JSON parse error
    expect(mockLogger.error).toHaveBeenCalledWith('Error fetching data Google Books API.', expect.any(SyntaxError))
    expect(result).toBeNull()
  })

  it('should handle single book with minimal data', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '3'
    }

    const mockMinimalResponse = {
      items: [
        {
          id: 'minimal-book-id',
          volumeInfo: {
            title: 'Minimal Book'
            // Missing other fields
          }
        }
      ]
    }

    mockGot.mockResolvedValue({ body: JSON.stringify(mockMinimalResponse) })

    const result = await fetchBook(bookInput)

    expect(result).toEqual({
      book: mockMinimalResponse.items[0],
      rating: '3'
    })
  })

  it('should handle multiple books in response (takes first)', async () => {
    const bookInput = {
      isbn: '9780143127550',
      rating: '5'
    }

    const mockMultipleBooksResponse = {
      items: [
        {
          id: 'first-book-id',
          volumeInfo: {
            title: 'First Book',
            authors: ['First Author']
          }
        },
        {
          id: 'second-book-id',
          volumeInfo: {
            title: 'Second Book',
            authors: ['Second Author']
          }
        }
      ]
    }

    mockGot.mockResolvedValue({ body: JSON.stringify(mockMultipleBooksResponse) })

    const result = await fetchBook(bookInput)

    // Should return the first book only
    expect(result).toEqual({
      book: mockMultipleBooksResponse.items[0],
      rating: '5'
    })
  })
}) 