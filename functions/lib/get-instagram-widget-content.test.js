import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import getInstagramWidgetContent from './get-instagram-widget-content.js'

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

describe('getInstagramWidgetContent', () => {
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
      media: [
        {
          id: '123',
          images: { thumbnail: { url: 'https://example.com/image.jpg' } }
        }
      ],
      profile: {
        biography: 'Test bio',
        followersCount: 1000,
        mediaCount: 50,
        username: 'testuser'
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getInstagramWidgetContent()

    expect(result).toEqual({
      collections: {
        media: mockData.media
      },
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      },
      metrics: [
        {
          displayName: 'Followers',
          id: 'followers-count',
          value: 1000
        },
        {
          displayName: 'Posts',
          id: 'media-count',
          value: 50
        }
      ],
      provider: {
        displayName: 'Instagram',
        id: 'instagram'
      },
      profile: {
        biography: 'Test bio',
        displayName: 'testuser',
        profileURL: 'https://www.instagram.com/testuser'
      }
    })

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('instagram')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockGet).toHaveBeenCalled()
  })

  it('should handle missing profile data with defaults', async () => {
    const mockData = {
      meta: {
        synced: {
          _seconds: 1640995200,
          _nanoseconds: 0
        }
      },
      media: []
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getInstagramWidgetContent()

    expect(result.profile).toEqual({
      biography: '',
      displayName: '',
      profileURL: 'https://www.instagram.com/'
    })

    expect(result.metrics).toEqual([
      {
        displayName: 'Followers',
        id: 'followers-count',
        value: 0
      },
      {
        displayName: 'Posts',
        id: 'media-count',
        value: 0
      }
    ])
  })

  it('should throw error when data retrieval fails', async () => {
    mockGet.mockResolvedValue({
      data: () => null
    })

    await expect(getInstagramWidgetContent()).rejects.toThrow('Failed to get a response.')
  })

  it('should throw error when get() throws', async () => {
    mockGet.mockRejectedValue(new Error('Database error'))

    await expect(getInstagramWidgetContent()).rejects.toThrow('Database error')
  })
}) 