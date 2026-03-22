import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import syncFlickrData from './sync-flickr-data.js'
import type { DocumentStore } from '../ports/document-store.js'
import { configureLogger } from '../services/logger.js'

vi.mock('../api/flickr/fetch-photos.js', () => ({
  default: vi.fn(),
}))

import fetchPhotos from '../api/flickr/fetch-photos.js'

describe('syncFlickrData', () => {
  let documentStore: DocumentStore
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configureLogger(logger)
    process.env.FLICKR_USER_ID = 'testuser'

    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    delete process.env.FLICKR_USER_ID
  })

  it('should sync Flickr data successfully', async () => {
    const mockPhotosResponse = {
      total: 2,
      photos: [
        { id: '1', title: 'Photo 1' },
        { id: '2', title: 'Photo 2' },
      ],
    }

    vi.mocked(fetchPhotos).mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData(documentStore)

    expect(fetchPhotos).toHaveBeenCalled()
    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      1,
      'users/chrisvogt/flickr/last-response',
      {
        response: mockPhotosResponse,
        fetchedAt: expect.any(String),
      }
    )
    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      2,
      'users/chrisvogt/flickr/widget-content',
      {
        collections: {
          photos: mockPhotosResponse.photos,
        },
        meta: {
          synced: expect.any(String),
        },
        metrics: [
          {
            displayName: 'Photos',
            id: 'photos-count',
            value: 2,
          },
        ],
        profile: {
          displayName: 'testuser',
          profileURL: 'https://www.flickr.com/photos/testuser/',
        },
      }
    )

    expect(result).toEqual({
      result: 'SUCCESS',
      widgetContent: {
        collections: {
          photos: mockPhotosResponse.photos,
        },
        meta: {
          synced: expect.any(String),
        },
        metrics: [
          {
            displayName: 'Photos',
            id: 'photos-count',
            value: 2,
          },
        ],
        profile: {
          displayName: 'testuser',
          profileURL: 'https://www.flickr.com/photos/testuser/',
        },
      },
    })

    expect(logger.info).toHaveBeenCalledWith('Flickr data sync completed successfully', {
      totalPhotos: 2,
      photosFetched: 2,
    })
  })

  it('should handle empty photos response', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 0,
      photos: [],
    })

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(logger.info).toHaveBeenCalledWith('Flickr data sync completed successfully', {
      totalPhotos: 0,
      photosFetched: 0,
    })
  })

  it('should handle missing FLICKR_USER_ID environment variable', async () => {
    delete process.env.FLICKR_USER_ID

    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }],
    })

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.profile.displayName).toBeUndefined()
    expect(result.widgetContent.profile.profileURL).toBe('https://www.flickr.com/photos/undefined/')
  })

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('Flickr API error')
    vi.mocked(fetchPhotos).mockRejectedValue(apiError)

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Flickr API error')
    expect(logger.error).toHaveBeenCalledWith('Flickr data sync failed:', apiError)
  })

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network timeout')
    vi.mocked(fetchPhotos).mockRejectedValue(networkError)

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Network timeout')
    expect(logger.error).toHaveBeenCalledWith('Flickr data sync failed:', networkError)
  })

  it('should handle malformed photos response', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 'invalid',
      photos: null,
    })

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(result.widgetContent.collections.photos).toEqual([])
  })

  it('should handle photos response with missing total property', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      photos: [{ id: '1', title: 'Photo 1' }],
    })

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.metrics).toEqual([])
    expect(result.widgetContent.collections.photos).toEqual([{ id: '1', title: 'Photo 1' }])
  })

  it('should handle photos response with missing photos property', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 5,
    })

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.collections.photos).toEqual([])
    expect(result.widgetContent.metrics).toEqual([
      {
        displayName: 'Photos',
        id: 'photos-count',
        value: 5,
      },
    ])
  })

  it('should handle storage save errors', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }],
    })

    vi.mocked(documentStore.setDocument).mockRejectedValueOnce(new Error('Storage save failed'))

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Storage save failed')
  })

  it('should handle partial storage save errors', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 1,
      photos: [{ id: '1', title: 'Photo 1' }],
    })

    vi.mocked(documentStore.setDocument)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Widget content save failed'))

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Widget content save failed')
  })

  it('should handle photos with missing properties', async () => {
    const mockPhotosResponse = {
      total: 2,
      photos: [
        { id: '1', title: 'Photo 1' },
        { id: '2' },
      ],
    }

    vi.mocked(fetchPhotos).mockResolvedValue(mockPhotosResponse)

    const result = await syncFlickrData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.widgetContent.collections.photos).toEqual(mockPhotosResponse.photos)
    expect(result.widgetContent.collections.photos[1].title).toBeUndefined()
  })

  it('should support writing Flickr shadow data to tmp collections', async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      total: 0,
      photos: [],
    })

    await syncFlickrData(documentStore, {
      source: 'shadow',
      userId: 'chrisvogt',
    })

    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      1,
      'users/chrisvogt/flickr_tmp/last-response',
      expect.any(Object)
    )
    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      2,
      'users/chrisvogt/flickr_tmp/widget-content',
      expect.any(Object)
    )
  })
})
