import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import syncFlickrData from './sync-flickr-data.js'

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn()
        }))
      }))
    })),
    Timestamp: {
      now: vi.fn(() => '2023-01-01T00:00:00Z')
    }
  }
}))

// Mock firebase-functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

// Mock fetchPhotos
vi.mock('../api/flickr/fetch-photos.js', () => ({
  default: vi.fn()
}))

import admin from 'firebase-admin'
import { logger } from 'firebase-functions'
import fetchPhotos from '../api/flickr/fetch-photos.js'

describe('syncFlickrData', () => {
  let mockFirestore, mockCollection, mockDoc, mockSet

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set environment variable
    process.env.FLICKR_USER_ID = 'testuser'
    
    mockSet = vi.fn()
    mockDoc = vi.fn(() => ({ set: mockSet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockFirestore = vi.fn(() => ({ collection: mockCollection }))
    
    admin.firestore = mockFirestore
    admin.Timestamp.now = vi.fn(() => '2023-01-01T00:00:00Z')
  })

  afterEach(() => {
    delete process.env.FLICKR_USER_ID
  })

  it('should sync Flickr data successfully', async () => {
    const mockPhotosResponse = {
      total: 2,
      photos: [
        { id: '1', title: 'Photo 1' },
        { id: '2', title: 'Photo 2' }
      ]
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData()

    expect(fetchPhotos).toHaveBeenCalled()
    expect(admin.firestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/flickr')
    
    // Check that last-response document is saved
    expect(mockDoc).toHaveBeenCalledWith('last-response')
    expect(mockSet).toHaveBeenCalledWith({
      response: mockPhotosResponse,
      fetchedAt: expect.any(Object) // Firestore Timestamp object
    })
    
    // Check that widget-content document is saved
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockSet).toHaveBeenCalledWith({
      collections: {
        photos: mockPhotosResponse.photos
      },
      meta: {
        synced: expect.any(Object) // Firestore Timestamp object
      },
      metrics: [
        {
          displayName: 'Photos',
          id: 'photos-count',
          value: 2
        }
      ],
      profile: {
        displayName: 'testuser',
        profileURL: 'https://www.flickr.com/photos/testuser/'
      }
    })

    expect(result).toEqual({
      result: 'SUCCESS',
      widgetContent: {
        collections: {
          photos: mockPhotosResponse.photos
        },
        meta: {
          synced: expect.any(Object) // Firestore Timestamp object
        },
        metrics: [
          {
            displayName: 'Photos',
            id: 'photos-count',
            value: 2
          }
        ],
        profile: {
          displayName: 'testuser',
          profileURL: 'https://www.flickr.com/photos/testuser/'
        }
      }
    })

    expect(logger.info).toHaveBeenCalledWith('Flickr data sync completed successfully', {
      totalPhotos: 2,
      photosFetched: 2
    })
  })

  it('should handle empty photos response', async () => {
    const mockPhotosResponse = {
      total: 0,
      photos: []
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(logger.info).toHaveBeenCalledWith('Flickr data sync completed successfully', {
      totalPhotos: 0,
      photosFetched: 0
    })
  })

  it('should handle missing FLICKR_USER_ID environment variable', async () => {
    delete process.env.FLICKR_USER_ID

    const mockPhotosResponse = {
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }]
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.profile.displayName).toBeUndefined()
    expect(result.widgetContent.profile.profileURL).toBe('https://www.flickr.com/photos/undefined/')
  })

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('Flickr API error')
    fetchPhotos.mockRejectedValue(apiError)

    const result = await syncFlickrData()

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Flickr API error')
    expect(logger.error).toHaveBeenCalledWith('Flickr data sync failed:', apiError)
  })

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network timeout')
    fetchPhotos.mockRejectedValue(networkError)

    const result = await syncFlickrData()

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Network timeout')
    expect(logger.error).toHaveBeenCalledWith('Flickr data sync failed:', networkError)
  })

  it('should handle malformed photos response', async () => {
    const malformedResponse = {
      total: 'invalid', // Should be number
      photos: null // Should be array
    }

    fetchPhotos.mockResolvedValue(malformedResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(result.widgetContent.collections.photos).toEqual([])
  })

  it('should handle photos response with missing total property', async () => {
    const incompleteResponse = {
      photos: [{ id: '1', title: 'Photo 1' }]
      // Missing total property
    }

    fetchPhotos.mockResolvedValue(incompleteResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(result.widgetContent.collections.photos).toEqual([{ id: '1', title: 'Photo 1' }])
  })

  it('should handle photos response with missing photos property', async () => {
    const incompleteResponse = {
      total: 5
      // Missing photos property
    }

    fetchPhotos.mockResolvedValue(incompleteResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.collections.photos).toEqual([])
    expect(result.widgetContent.metrics).toEqual([
      {
        displayName: 'Photos',
        id: 'photos-count',
        value: 5,
      }
    ])
  })

  it('should handle Firestore save errors', async () => {
    const mockPhotosResponse = {
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }]
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)
    
    const firestoreError = new Error('Firestore save failed')
    mockSet.mockRejectedValue(firestoreError)

    const result = await syncFlickrData()

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Firestore save failed')
    expect(logger.error).toHaveBeenCalledWith('Flickr data sync failed:', firestoreError)
  })

  it('should handle partial Firestore save errors', async () => {
    const mockPhotosResponse = {
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }]
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)
    
    // First save succeeds, second fails
    mockSet
      .mockResolvedValueOnce() // last-response save
      .mockRejectedValueOnce(new Error('Widget content save failed')) // widget-content save

    const result = await syncFlickrData()

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Widget content save failed')
  })

  it('should handle photos with missing properties', async () => {
    const mockPhotosResponse = {
      total: 2,
      photos: [
        { id: '1', title: 'Photo 1' },
        { id: '2' } // Missing title
      ]
    }

    fetchPhotos.mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData()

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.collections.photos).toEqual(mockPhotosResponse.photos)
    expect(result.widgetContent.collections.photos[1].title).toBeUndefined()
  })
})
