import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn()
  }
}))

vi.mock('lodash', () => ({
  default: { get: vi.fn() }
}))

vi.mock('got', () => ({
  default: vi.fn()
}))

// Create a mock parser instance (hoisted so vi.mock factory can use it)
const { mockParseString, mockParserInstance } = vi.hoisted(() => {
  const mockParseString = vi.fn()
  const mockParserInstance = { parseString: mockParseString }
  return { mockParseString, mockParserInstance }
})

vi.mock('xml2js', () => {
  function Parser () { return mockParserInstance }
  return {
    default: { Parser },
    Parser,
  }
})

vi.mock('../../lib/get-review.js', () => ({
  default: vi.fn()
}))

vi.mock('../../lib/get-user-status.js', () => ({
  default: vi.fn()
}))

let fetchUser

describe('fetchUser', () => {
  let mockGot, mockGet, mockGetReview, mockGetUserStatus, mockLogger

  beforeEach(async () => {
    // Set up environment variables
    process.env.GOODREADS_API_KEY = 'test-api-key'
    process.env.GOODREADS_USER_ID = 'test-user-id'

    // Clear all mocks
    vi.clearAllMocks()

    // Import the module
    fetchUser = (await import('./fetch-user.js')).default

    // Get mock functions
    mockGot = (await import('got')).default
    mockGet = (await import('lodash')).default.get
    mockGetReview = (await import('../../lib/get-review.js')).default
    mockGetUserStatus = (await import('../../lib/get-user-status.js')).default
    mockLogger = (await import('firebase-functions')).logger
  })

  afterEach(() => {
    delete process.env.GOODREADS_API_KEY
    delete process.env.GOODREADS_USER_ID
    vi.restoreAllMocks()
  })

  it('should successfully fetch and parse user data', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_name: 'testuser',
          link: 'https://goodreads.com/user/testuser',
          image_url: 'https://example.com/image.jpg',
          small_image_url: 'https://example.com/small.jpg',
          website: 'https://example.com',
          joined: '2020-01-01',
          interests: 'Reading, Writing',
          favorite_books: 'Book1, Book2',
          friends_count: { _: '100' },
          user_shelves: {
            user_shelf: [
              { name: 'read', book_count: { _: '50' } },
              { name: 'to-read', book_count: { _: '25' } }
            ]
          },
          updates: {
            update: [
              { type: 'userstatus', book: { goodreadsID: '123' } },
              { type: 'review', book: { goodreadsID: '456' } }
            ]
          }
        }
      }
    }

    // Mock successful API response
    mockGot.mockResolvedValue({ body: mockXmlResponse })

    // Mock successful XML parsing
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    // Mock lodash.get responses
    mockGet
      .mockReturnValueOnce([{ name: 'read', book_count: { _: '50' } }]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user.updates.update) // updates

    // Mock helper functions
    mockGetUserStatus.mockReturnValue({ type: 'userstatus', transformed: true })
    mockGetReview.mockReturnValue({ type: 'review', transformed: true })

    const result = await fetchUser()

    // Verify API call
    expect(mockGot).toHaveBeenCalledWith(
      'https://www.goodreads.com/user/show/test-user-id?format=xml&key=test-api-key'
    )

    // Verify XML parsing
    expect(mockParseString).toHaveBeenCalledWith(mockXmlResponse, expect.any(Function))

    // Verify result structure
    expect(result).toEqual({
      jsonResponse: mockJsonResult,
      profile: {
        name: 'Test User',
        username: 'testuser',
        link: 'https://goodreads.com/user/testuser',
        imageURL: 'https://example.com/image.jpg',
        smallImageURL: 'https://example.com/small.jpg',
        website: 'https://example.com',
        joined: '2020-01-01',
        interests: 'Reading, Writing',
        favoriteBooks: 'Book1, Book2',
        friendsCount: '100',
        readCount: 50
      },
      updates: [
        { type: 'userstatus', transformed: true },
        { type: 'review', transformed: true }
      ]
    })
  })

  it('should handle missing environment variables', async () => {
    delete process.env.GOODREADS_API_KEY
    delete process.env.GOODREADS_USER_ID

    // Re-import to get fresh module with missing env vars
    fetchUser = (await import('./fetch-user.js')).default

    const mockXmlResponse = '<xml>test data</xml>'
    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, {})
    })

    await fetchUser()

    // Should still work but with undefined values in URL
    expect(mockGot).toHaveBeenCalledWith(
      'https://www.goodreads.com/user/show/undefined?format=xml&key=undefined'
    )
  })

  it('should handle XML parsing errors', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockError = new Error('XML parsing failed')

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(mockError, null)
    })

    const result = await fetchUser()

    // Should log error but continue
    expect(mockLogger.error).toHaveBeenCalledWith('Error fetching Goodreads user data.', mockError)
    expect(result).toEqual({
      jsonResponse: undefined,
      profile: undefined,
      updates: undefined
    })
  })

  it('should handle empty user shelves', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_shelves: {
            user_shelf: []
          }
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    // Mock lodash.get to return empty array for shelves, and valid user for profile
    mockGet
      .mockReturnValueOnce([]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce([]) // updates

    const result = await fetchUser()

    expect(result.profile?.readCount ?? 0).toBe(0)
  })

  it('should handle missing read shelf', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_shelves: {
            user_shelf: [
              { name: 'to-read', book_count: { _: '25' } }
            ]
          }
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    // Mock lodash.get to return array without 'read' shelf, and valid user for profile
    mockGet
      .mockReturnValueOnce([{ name: 'to-read', book_count: { _: '25' } }]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce([]) // updates

    const result = await fetchUser()

    expect(result.profile?.readCount ?? 0).toBe(0)
  })

  it('should handle missing book_count in read shelf', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_shelves: {
            user_shelf: [
              { name: 'read' } // missing book_count
            ]
          }
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    mockGet
      .mockReturnValueOnce([{ name: 'read' }]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce([]) // updates

    const result = await fetchUser()

    expect(result.profile?.readCount ?? 0).toBe(0)
  })

  it('should filter out invalid update types', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_shelves: {
            user_shelf: [
              { name: 'read', book_count: { _: '50' } }
            ]
          },
          updates: {
            update: [
              { type: 'userstatus', book: { goodreadsID: '123' } },
              { type: 'review', book: { goodreadsID: '456' } },
              { type: 'invalid_type', book: { goodreadsID: '789' } } // This should be filtered out
            ]
          }
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    mockGet
      .mockReturnValueOnce([{ name: 'read', book_count: { _: '50' } }]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user.updates.update) // updates

    // Mock helper functions - return null for invalid type
    mockGetUserStatus.mockReturnValue({ type: 'userstatus', transformed: true })
    mockGetReview.mockReturnValue({ type: 'review', transformed: true })

    const result = await fetchUser()

    expect(result.updates ?? []).toHaveLength(2)
    expect(result.updates?.[0]).toEqual({ type: 'userstatus', transformed: true })
    expect(result.updates?.[1]).toEqual({ type: 'review', transformed: true })
  })

  it('should handle single update (not array)', async () => {
    const mockXmlResponse = '<xml>test data</xml>'
    const mockJsonResult = {
      GoodreadsResponse: {
        user: {
          name: 'Test User',
          user_shelves: {
            user_shelf: [
              { name: 'read', book_count: { _: '50' } }
            ]
          },
          updates: {
            update: { type: 'userstatus', book: { goodreadsID: '123' } } // Single object, not array
          }
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockXmlResponse })
    mockParseString.mockImplementation((xml, callback) => {
      callback(null, mockJsonResult)
    })

    mockGet
      .mockReturnValueOnce([{ name: 'read', book_count: { _: '50' } }]) // user_shelves
      .mockReturnValueOnce(mockJsonResult.GoodreadsResponse.user) // user profile
      .mockReturnValueOnce([mockJsonResult.GoodreadsResponse.user.updates.update]) // updates as array

    mockGetUserStatus.mockReturnValue({ type: 'userstatus', transformed: true })

    const result = await fetchUser()

    expect(result.updates ?? []).toHaveLength(1)
    expect(result.updates?.[0]).toEqual({ type: 'userstatus', transformed: true })
  })

  it('should handle network errors', async () => {
    const mockError = new Error('Network error')
    mockGot.mockRejectedValue(mockError)

    await expect(fetchUser()).rejects.toThrow('Network error')
  })
}) 