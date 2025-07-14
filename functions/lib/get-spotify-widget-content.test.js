import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'
import getSpotifyWidgetContent from './get-spotify-widget-content.js'

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

describe('getSpotifyWidgetContent', () => {
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
        playlists: [
          {
            id: 'playlist1',
            name: 'Test Playlist',
            images: [{ url: 'https://example.com/image.jpg' }]
          }
        ],
        topTracks: [
          {
            id: 'track1',
            name: 'Test Track',
            artists: [{ name: 'Test Artist' }]
          }
        ]
      },
      metrics: [
        {
          displayName: 'Followers',
          id: 'followers-count',
          value: 1000
        }
      ],
      profile: {
        displayName: 'Test User',
        id: 'user123',
        profileURL: 'https://open.spotify.com/user/user123'
      }
    }

    mockGet.mockResolvedValue({
      data: () => mockData
    })

    const result = await getSpotifyWidgetContent()

    expect(result).toEqual({
      collections: mockData.collections,
      metrics: mockData.metrics,
      profile: mockData.profile,
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/spotify')
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

    const result = await getSpotifyWidgetContent()

    expect(result).toEqual({
      meta: {
        synced: new Timestamp(1640995200, 0).toDate()
      }
    })
  })

  it('should throw error when data retrieval fails', async () => {
    mockGet.mockResolvedValue({
      data: () => null
    })

    await expect(getSpotifyWidgetContent()).rejects.toThrow()
  })

  it('should throw error when get() throws', async () => {
    mockGet.mockRejectedValue(new Error('Database error'))

    await expect(getSpotifyWidgetContent()).rejects.toThrow('Database error')
  })
}) 