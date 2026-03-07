import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import syncInstagramData from './sync-instagram-data.js'

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
vi.mock('../api/instagram/fetch-instagram-data.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/list-stored-media.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/fetch-and-upload-file.js', () => ({
  default: vi.fn(async (item) => ({ fileName: item.destinationPath || 'chrisvogt/instagram/test.jpg' }))
}))

vi.mock('../transformers/transform-instagram-media.js', () => ({
  default: vi.fn((media) => ({ ...media, transformed: true }))
}))

vi.mock('../transformers/to-ig-destination-path.js', () => ({
  default: vi.fn(() => 'chrisvogt/instagram/test.jpg')
}))

import fetchInstagramData from '../api/instagram/fetch-instagram-data.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'

describe('syncInstagramData', () => {
  let mockSet
  let mockDoc
  let mockCollection
  let mockFirestore

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSet = vi.fn()
    mockDoc = vi.fn(() => ({ set: mockSet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockFirestore = vi.fn(() => ({ collection: mockCollection }))
    
    admin.firestore = mockFirestore
  })

  it('should successfully sync Instagram data and save to database', async () => {
    const mockInstagramResponse = {
      media: {
        data: [
          {
            id: 'media1',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg'
          },
          {
            id: 'media2',
            media_type: 'CAROUSEL_ALBUM',
            media_url: 'https://example.com/image2.jpg',
            children: {
              data: [
                {
                  id: 'child1',
                  media_url: 'https://example.com/child1.jpg',
                  thumbnail_url: 'https://example.com/child1_thumb.jpg'
                }
              ]
            }
          }
        ]
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser'
    }

    fetchInstagramData.mockResolvedValue(mockInstagramResponse)
    listStoredMedia.mockResolvedValue([])

    const result = await syncInstagramData()

    expect(result.result).toBe('SUCCESS')
    expect(result.data.media).toHaveLength(2)
    expect(result.data.profile).toEqual({
      biography: 'Test bio',
      followersCount: 1000,
      mediaCount: 50,
      username: 'testuser'
    })
    expect(result.data.meta.synced).toBeInstanceOf(Timestamp)

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/instagram')
    expect(mockDoc).toHaveBeenCalledWith('last-response')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it('should handle API errors gracefully', async () => {
    fetchInstagramData.mockRejectedValue(new Error('Instagram API Error'))

    const result = await syncInstagramData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Instagram API Error'
    })

    expect(mockSet).not.toHaveBeenCalled()
  })

  it('should handle database save errors', async () => {
    const mockInstagramResponse = {
      media: { data: [] },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser'
    }

    fetchInstagramData.mockResolvedValue(mockInstagramResponse)
    listStoredMedia.mockResolvedValue([])
    mockSet.mockRejectedValue(new Error('Database Error'))

    const result = await syncInstagramData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Database Error'
    })
  })

  it('should filter out invalid media types', async () => {
    const mockInstagramResponse = {
      media: {
        data: [
          {
            id: 'media1',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image1.jpg'
          },
          {
            id: 'media2',
            media_type: 'VIDEO',
            media_url: 'https://example.com/video1.mp4'
          },
          {
            id: 'media3',
            media_type: 'INVALID_TYPE',
            media_url: 'https://example.com/invalid.jpg'
          }
        ]
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser'
    }

    fetchInstagramData.mockResolvedValue(mockInstagramResponse)
    listStoredMedia.mockResolvedValue([])

    const result = await syncInstagramData()

    // Should only include IMAGE and VIDEO types
    expect(result.data.media).toHaveLength(2)
    expect(result.data.media[0].id).toBe('media1')
    expect(result.data.media[1].id).toBe('media2')
  })

  it('should handle existing media files', async () => {
    const mockInstagramResponse = {
      media: {
        data: [
          {
            id: 'media1',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image1.jpg'
          }
        ]
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser'
    }

    fetchInstagramData.mockResolvedValue(mockInstagramResponse)
    // Mock that the media file already exists
    listStoredMedia.mockResolvedValue(['chrisvogt/instagram/media1.jpg'])

    const result = await syncInstagramData()

    expect(result.totalUploadedCount).toBe(1)
    expect(result.data.media).toHaveLength(1)
  })
}) 