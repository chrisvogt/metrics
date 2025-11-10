import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import syncGoodreadsData from './sync-goodreads-data.js'

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
}) 