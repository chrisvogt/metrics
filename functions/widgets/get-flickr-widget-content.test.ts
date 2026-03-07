import { describe, it, expect, vi, beforeEach } from 'vitest'
import getFlickrWidgetContent from './get-flickr-widget-content.js'

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

// Mock firebase-functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn()
  }
}))

import admin from 'firebase-admin'
import { logger } from 'firebase-functions'

describe('getFlickrWidgetContent', () => {
  let mockFirestore, mockCollection, mockDoc, mockGet

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockGet = vi.fn()
    mockDoc = vi.fn(() => ({ get: mockGet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockFirestore = vi.fn(() => ({ collection: mockCollection }))
    
    admin.firestore = mockFirestore
  })

  it('should fetch Flickr widget content successfully', async () => {
    const mockData = {
      collections: {
        photos: [
          { id: '1', title: 'Photo 1' },
          { id: '2', title: 'Photo 2' }
        ]
      },
      meta: {
        synced: '2023-01-01T00:00:00Z'
      },
      metrics: [
        {
          displayName: 'Photos',
          value: 2
        }
      ]
    }

    const mockDocSnapshot = {
      exists: true,
      data: () => mockData
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(admin.firestore).toHaveBeenCalled()
    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/flickr')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockGet).toHaveBeenCalled()
    expect(result).toEqual(mockData)
  })

  it('should throw error when document does not exist', async () => {
    const mockDocSnapshot = {
      exists: false
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    await expect(getFlickrWidgetContent()).rejects.toThrow('No Flickr data found in Firestore')
  })

  it('should handle Firestore errors', async () => {
    const firestoreError = new Error('Firestore connection failed')
    mockGet.mockRejectedValue(firestoreError)

    await expect(getFlickrWidgetContent()).rejects.toThrow('Firestore connection failed')
    expect(logger.error).toHaveBeenCalledWith('Error getting Flickr widget content:', firestoreError)
  })

  it('should handle network errors', async () => {
    const networkError = new Error('Network timeout')
    mockGet.mockRejectedValue(networkError)

    await expect(getFlickrWidgetContent()).rejects.toThrow('Network timeout')
    expect(logger.error).toHaveBeenCalledWith('Error getting Flickr widget content:', networkError)
  })

  it('should handle permission errors', async () => {
    const permissionError = new Error('Permission denied')
    mockGet.mockRejectedValue(permissionError)

    await expect(getFlickrWidgetContent()).rejects.toThrow('Permission denied')
    expect(logger.error).toHaveBeenCalledWith('Error getting Flickr widget content:', permissionError)
  })

  it('should handle malformed document data', async () => {
    const mockDocSnapshot = {
      exists: true,
      data: () => null // Malformed data
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(result).toBeNull()
  })

  it('should handle empty document data', async () => {
    const mockDocSnapshot = {
      exists: true,
      data: () => undefined // Document exists but has no data
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(result).toBeUndefined()
  })

  it('should handle document with only partial data', async () => {
    const partialData = {
      collections: {
        photos: []
      }
      // Missing meta and metrics
    }

    const mockDocSnapshot = {
      exists: true,
      data: () => partialData
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(result).toEqual(partialData)
    expect(result.collections.photos).toEqual([])
    expect(result.meta).toBeUndefined()
    expect(result.metrics).toBeUndefined()
  })

  it('should handle document with nested null values', async () => {
    const dataWithNulls = {
      collections: {
        photos: null
      },
      meta: null,
      metrics: null
    }

    const mockDocSnapshot = {
      exists: true,
      data: () => dataWithNulls
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(result).toEqual(dataWithNulls)
    expect(result.collections.photos).toBeNull()
  })

  it('should handle document with undefined values', async () => {
    const dataWithUndefined = {
      collections: {
        photos: undefined
      },
      meta: undefined,
      metrics: undefined
    }

    const mockDocSnapshot = {
      exists: true,
      data: () => dataWithUndefined
    }

    mockGet.mockResolvedValue(mockDocSnapshot)

    const result = await getFlickrWidgetContent()

    expect(result).toEqual(dataWithUndefined)
    expect(result.collections.photos).toBeUndefined()
  })
})
