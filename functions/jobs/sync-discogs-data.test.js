import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import syncDiscogsData from './sync-discogs-data.js'

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
vi.mock('../api/discogs/fetch-releases.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/list-stored-media.js', () => ({
  default: vi.fn()
}))

vi.mock('../api/cloud-storage/fetch-and-upload-file.js', () => ({
  default: vi.fn(async (item) => ({ fileName: item.destinationPath || 'chrisvogt/discogs/test.jpg' }))
}))

vi.mock('../transformers/transform-discogs-release.js', () => ({
  default: vi.fn((release) => ({ ...release, transformed: true }))
}))

vi.mock('../transformers/to-discogs-destination-path.js', () => ({
  default: vi.fn((imageURL, releaseId, imageType) => `chrisvogt/discogs/${releaseId}_${imageType}.jpg`)
}))

import fetchDiscogsReleases from '../api/discogs/fetch-releases.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'

describe('syncDiscogsData', () => {
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

  it('should successfully sync Discogs data and save to database', async () => {
    const mockDiscogsResponse = {
      pagination: {
        page: 1,
        pages: 1,
        per_page: 2,
        items: 2,
        urls: {}
      },
      releases: [
        {
          id: 28461454,
          instance_id: 2045415075,
          date_added: '2025-07-27T23:34:53-07:00',
          rating: 0,
          basic_information: {
            id: 28461454,
            master_id: 3255691,
            thumb: 'https://example.com/thumb1.jpg',
            cover_image: 'https://example.com/cover1.jpg',
            title: 'The Rise & Fall Of A Midwest Princess',
            year: 2023,
            artists: [{ name: 'Chappell Roan' }]
          },
          folder_id: 1
        },
        {
          id: 33129744,
          instance_id: 2045415339,
          date_added: '2025-07-27T23:37:53-07:00',
          rating: 0,
          basic_information: {
            id: 33129744,
            master_id: 3505440,
            thumb: 'https://example.com/thumb2.jpg',
            cover_image: 'https://example.com/cover2.jpg',
            title: 'Brat And It\'s Completely Different',
            year: 2025,
            artists: [{ name: 'Charli XCX' }]
          },
          folder_id: 1
        }
      ]
    }

    fetchDiscogsReleases.mockResolvedValue(mockDiscogsResponse)
    listStoredMedia.mockResolvedValue([])

    const result = await syncDiscogsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.data.collections.releases).toHaveLength(2)
    expect(result.data.metrics['LPs Owned']).toBe(2)
    expect(result.data.meta.synced).toBeInstanceOf(Timestamp)

    expect(mockFirestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/discogs')
    expect(mockDoc).toHaveBeenCalledWith('last-response')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it('should handle API errors gracefully', async () => {
    fetchDiscogsReleases.mockRejectedValue(new Error('Discogs API Error'))

    const result = await syncDiscogsData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Discogs API Error'
    })

    expect(mockSet).not.toHaveBeenCalled()
  })

  it('should handle database save errors', async () => {
    const mockDiscogsResponse = {
      pagination: { page: 1, pages: 1, per_page: 0, items: 0, urls: {} },
      releases: []
    }

    fetchDiscogsReleases.mockResolvedValue(mockDiscogsResponse)
    listStoredMedia.mockResolvedValue([])
    mockSet.mockRejectedValue(new Error('Database Error'))

    const result = await syncDiscogsData()

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Database Error'
    })
  })

  it('should handle existing media files', async () => {
    const mockDiscogsResponse = {
      pagination: { page: 1, pages: 1, per_page: 1, items: 1, urls: {} },
      releases: [
        {
          id: 28461454,
          instance_id: 2045415075,
          date_added: '2025-07-27T23:34:53-07:00',
          rating: 0,
          basic_information: {
            id: 28461454,
            thumb: 'https://example.com/thumb1.jpg',
            cover_image: 'https://example.com/cover1.jpg',
            title: 'Test Album',
            year: 2023
          },
          folder_id: 1
        }
      ]
    }

    fetchDiscogsReleases.mockResolvedValue(mockDiscogsResponse)
    // Mock that media files already exist
    listStoredMedia.mockResolvedValue(['chrisvogt/discogs/28461454_thumb.jpg', 'chrisvogt/discogs/28461454_cover.jpg'])

    const result = await syncDiscogsData()

    expect(result.totalUploadedCount).toBe(0)
    expect(result.data.collections.releases).toHaveLength(1)
  })

  it('should process releases without images', async () => {
    const mockDiscogsResponse = {
      pagination: { page: 1, pages: 1, per_page: 1, items: 1, urls: {} },
      releases: [
        {
          id: 123456,
          instance_id: 987654,
          date_added: '2025-01-01T00:00:00-00:00',
          rating: 5,
          basic_information: {
            id: 123456,
            thumb: null,
            cover_image: null,
            title: 'Album Without Images',
            year: 2024
          },
          folder_id: 1
        }
      ]
    }

    fetchDiscogsReleases.mockResolvedValue(mockDiscogsResponse)
    listStoredMedia.mockResolvedValue([])

    const result = await syncDiscogsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.totalUploadedCount).toBe(0)
    expect(result.data.collections.releases).toHaveLength(1)
  })

  it('should handle partial media files (only thumb or only cover)', async () => {
    const mockDiscogsResponse = {
      pagination: { page: 1, pages: 1, per_page: 1, items: 1, urls: {} },
      releases: [
        {
          id: 789123,
          instance_id: 456789,
          date_added: '2025-01-01T00:00:00-00:00',
          rating: 3,
          basic_information: {
            id: 789123,
            thumb: 'https://example.com/thumb.jpg',
            cover_image: null,
            title: 'Album With Only Thumb',
            year: 2024
          },
          folder_id: 1
        }
      ]
    }

    fetchDiscogsReleases.mockResolvedValue(mockDiscogsResponse)
    listStoredMedia.mockResolvedValue([])

    const result = await syncDiscogsData()

    expect(result.result).toBe('SUCCESS')
    expect(result.totalUploadedCount).toBe(1)
    expect(result.data.collections.releases).toHaveLength(1)
  })
}) 