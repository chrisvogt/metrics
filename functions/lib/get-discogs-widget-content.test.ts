import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import getDiscogsWidgetContent from './get-discogs-widget-content.js'

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

describe('getDiscogsWidgetContent', () => {
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
        releases: [
          {
            id: 28461454,
            title: 'The Rise & Fall Of A Midwest Princess',
            artist: 'Chappell Roan',
            year: 2023
          }
        ]
      },
      metrics: {
        'LPs Owned': 150
      },
      profile: {
        profileURL: 'https://www.discogs.com/user/chrisvogt/collection'
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getDiscogsWidgetContent()

    expect(result).toEqual({
      collections: mockData.collections,
      metrics: mockData.metrics,
      profile: mockData.profile,
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/discogs')
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

    const result = await getDiscogsWidgetContent()

    expect(result).toEqual({
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })
  })

  it('should handle missing meta data', async () => {
    const mockData = {
      collections: {
        releases: []
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getDiscogsWidgetContent()

    expect(result).toEqual({
      collections: mockData.collections,
      meta: {}
    })
  })

  it('should handle missing meta.synced data', async () => {
    const mockData = {
      meta: {},
      collections: {
        releases: []
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getDiscogsWidgetContent()

    expect(result).toEqual({
      collections: mockData.collections,
      meta: {}
    })
  })
}) 