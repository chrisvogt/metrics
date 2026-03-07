import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import getGoodreadsWidgetContent from './get-goodreads-widget-content.js'

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    }))
  }
}))

describe('getGoodreadsWidgetContent', () => {
  let mockGet
  let mockDoc
  let mockCollection
  let mockFirestore

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockGet = vi.fn()
    mockDoc = vi.fn(() => ({ get: mockGet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockFirestore = vi.fn(() => ({ collection: mockCollection }))
    
    admin.firestore = mockFirestore
  })

  it('should return properly formatted widget content', async () => {
    const mockData = {
      meta: {
        synced: {
          _seconds: 1640995200,
          _nanoseconds: 0
        }
      },
      collections: {
        recentlyReadBooks: [
          {
            id: 'book1',
            title: 'Test Book',
            author: 'Test Author',
            rating: 4
          }
        ],
        updates: [
          {
            id: 'update1',
            type: 'review',
            content: 'Great book!'
          }
        ]
      },
      profile: {
        displayName: 'Test User',
        profileURL: 'https://www.goodreads.com/user/show/123'
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getGoodreadsWidgetContent()

    expect(result).toEqual({
      collections: mockData.collections,
      profile: mockData.profile,
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/goodreads')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockGet).toHaveBeenCalled()
  })

  it('should handle missing data gracefully', async () => {
    const mockData = {
      meta: {
        synced: {
          _seconds: 1640995200,
          _nanoseconds: 0
        }
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getGoodreadsWidgetContent()

    expect(result).toEqual({
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })
  })

  it('should return default widget content when doc does not exist', async () => {
    mockGet.mockResolvedValue({
      data: () => undefined
    })

    const result = await getGoodreadsWidgetContent()

    expect(result).toEqual({
      meta: { synced: new Date(0) },
      recentBooks: [],
      summary: null,
    })
  })

  it('should throw error when get() throws', async () => {
    mockGet.mockRejectedValue(new Error('Database error'))

    await expect(getGoodreadsWidgetContent()).rejects.toThrow('Database error')
  })
}) 