import { beforeEach, describe, expect, it, vi } from 'vitest'

import syncDiscogsData from './sync-discogs-data.js'
import type { DocumentStore } from '../ports/document-store.js'
import { configureLogger } from '../services/logger.js'

vi.mock('../api/discogs/fetch-releases.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/discogs/fetch-releases-batch.js', () => ({
  default: vi.fn(async (releases) => releases),
}))

vi.mock('../services/media/media-service.js', () => ({
  describeMediaStore: vi.fn(() => ({ backend: 'disk', target: '/tmp/media' })),
  listStoredMedia: vi.fn(),
  storeRemoteMedia: vi.fn(async (item) => ({
    fileName: item.destinationPath || 'chrisvogt/discogs/test.jpg',
  })),
  toPublicMediaUrl: vi.fn((path) => `https://cdn.example.com/${path}`),
}))

vi.mock('../transformers/transform-discogs-release.js', () => ({
  default: vi.fn((release) => ({ ...release, transformed: true })),
}))

vi.mock('../transformers/to-discogs-destination-path.js', () => ({
  default: vi.fn((imageURL, releaseId, imageType) => `chrisvogt/discogs/${releaseId}_${imageType}.jpg`),
}))

import fetchDiscogsReleases from '../api/discogs/fetch-releases.js'
import { listStoredMedia, storeRemoteMedia } from '../services/media/media-service.js'

describe('syncDiscogsData', () => {
  let documentStore: DocumentStore
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configureLogger(logger)
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should successfully sync Discogs data and save to the document store', async () => {
    const mockDiscogsResponse = {
      pagination: { items: 2, page: 1, pages: 1, per_page: 2, urls: {} },
      releases: [
        {
          id: 1,
          basic_information: {
            thumb: 'https://example.com/thumb1.jpg',
            cover_image: 'https://example.com/cover1.jpg',
          },
        },
        {
          id: 2,
          basic_information: {
            thumb: 'https://example.com/thumb2.jpg',
            cover_image: 'https://example.com/cover2.jpg',
          },
        },
      ],
    }

    vi.mocked(fetchDiscogsReleases).mockResolvedValue(mockDiscogsResponse)
    vi.mocked(listStoredMedia).mockResolvedValue([])

    const result = await syncDiscogsData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.data.metrics['LPs Owned']).toBe(2)
    expect(result.data.meta.synced).toEqual(expect.any(String))

    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      1,
      'users/chrisvogt/discogs/last-response',
      expect.objectContaining({
        fetchedAt: expect.any(String),
      })
    )
    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      2,
      'users/chrisvogt/discogs/widget-content',
      expect.objectContaining({
        meta: {
          synced: expect.any(String),
        },
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(fetchDiscogsReleases).mockRejectedValue(new Error('Discogs API Error'))

    const result = await syncDiscogsData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Discogs API Error',
    })
    expect(documentStore.setDocument).not.toHaveBeenCalled()
  })

  it('should handle document store save errors', async () => {
    vi.mocked(fetchDiscogsReleases).mockResolvedValue({
      pagination: { items: 0, page: 1, pages: 1, per_page: 0, urls: {} },
      releases: [],
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])
    vi.mocked(documentStore.setDocument).mockRejectedValue(new Error('DocumentStore Error'))

    const result = await syncDiscogsData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'DocumentStore Error',
    })
  })

  it('should handle existing media files', async () => {
    vi.mocked(fetchDiscogsReleases).mockResolvedValue({
      pagination: { items: 1, page: 1, pages: 1, per_page: 1, urls: {} },
      releases: [
        {
          id: 28461454,
          basic_information: {
            thumb: 'https://example.com/thumb.jpg',
            cover_image: 'https://example.com/cover.jpg',
          },
        },
      ],
    })
    vi.mocked(listStoredMedia).mockResolvedValue([
      'chrisvogt/discogs/28461454_thumb.jpg',
      'chrisvogt/discogs/28461454_cover.jpg',
    ])

    const result = await syncDiscogsData(documentStore)

    expect(result.totalUploadedCount).toBe(0)
  })

  it('should continue when media uploads fail', async () => {
    vi.mocked(fetchDiscogsReleases).mockResolvedValue({
      pagination: { items: 1, page: 1, pages: 1, per_page: 1, urls: {} },
      releases: [
        {
          id: 9,
          basic_information: {
            thumb: 'https://example.com/thumb.jpg',
            cover_image: null,
          },
        },
      ],
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])
    vi.mocked(storeRemoteMedia).mockRejectedValueOnce(new Error('Upload failed'))

    const result = await syncDiscogsData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.totalUploadedCount).toBe(0)
  })
})
