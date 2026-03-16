import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase-admin/firestore'

import syncInstagramData from './sync-instagram-data.js'
import type { DocumentStore } from '../ports/document-store.js'

vi.mock('../api/instagram/fetch-instagram-data.js', () => ({
  default: vi.fn(),
}))

vi.mock('../services/media/media-service.js', () => ({
  listStoredMedia: vi.fn(),
  storeRemoteMedia: vi.fn(async (item) => ({
    fileName: item.destinationPath || 'chrisvogt/instagram/test.jpg',
  })),
  toPublicMediaUrl: vi.fn((path) => `https://cdn.example.com/${path}`),
}))

vi.mock('../transformers/transform-instagram-media.js', () => ({
  default: vi.fn((media) => ({ ...media, transformed: true })),
}))

vi.mock('../transformers/to-ig-destination-path.js', () => ({
  default: vi.fn(() => 'chrisvogt/instagram/test.jpg'),
}))

vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import fetchInstagramData from '../api/instagram/fetch-instagram-data.js'
import { listStoredMedia, storeRemoteMedia } from '../services/media/media-service.js'

describe('syncInstagramData', () => {
  let documentStore: DocumentStore

  beforeEach(() => {
    vi.clearAllMocks()
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should successfully sync Instagram data and save to the document store', async () => {
    vi.mocked(fetchInstagramData).mockResolvedValue({
      media: {
        data: [
          {
            id: 'media1',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
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
                  thumbnail_url: 'https://example.com/child1_thumb.jpg',
                },
              ],
            },
          },
        ],
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser',
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])

    const result = await syncInstagramData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.data.media).toHaveLength(2)
    expect(result.data.meta.synced).toBeInstanceOf(Timestamp)

    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      1,
      'users/chrisvogt/instagram/last-response',
      expect.objectContaining({
        fetchedAt: expect.any(Timestamp),
      })
    )
    expect(documentStore.setDocument).toHaveBeenNthCalledWith(
      2,
      'users/chrisvogt/instagram/widget-content',
      expect.objectContaining({
        meta: {
          synced: expect.any(Timestamp),
        },
        profile: {
          biography: 'Test bio',
          followersCount: 1000,
          mediaCount: 50,
          username: 'testuser',
        },
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(fetchInstagramData).mockRejectedValue(new Error('Instagram API Error'))

    const result = await syncInstagramData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Instagram API Error',
    })
  })

  it('should handle document store save errors', async () => {
    vi.mocked(fetchInstagramData).mockResolvedValue({
      media: { data: [] },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser',
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])
    vi.mocked(documentStore.setDocument).mockRejectedValue(new Error('DocumentStore Error'))

    const result = await syncInstagramData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'DocumentStore Error',
    })
  })

  it('should filter out invalid media types', async () => {
    vi.mocked(fetchInstagramData).mockResolvedValue({
      media: {
        data: [
          { id: 'media1', media_type: 'IMAGE', media_url: 'https://example.com/image1.jpg' },
          { id: 'media2', media_type: 'VIDEO', media_url: 'https://example.com/video1.mp4' },
          { id: 'media3', media_type: 'INVALID_TYPE', media_url: 'https://example.com/invalid.jpg' },
        ],
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser',
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])

    const result = await syncInstagramData(documentStore)

    expect(result.data.media).toHaveLength(2)
  })

  it('should continue when media uploads fail', async () => {
    vi.mocked(fetchInstagramData).mockResolvedValue({
      media: {
        data: [
          { id: 'media1', media_type: 'IMAGE', media_url: 'https://example.com/image1.jpg' },
        ],
      },
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      username: 'testuser',
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])
    vi.mocked(storeRemoteMedia).mockRejectedValueOnce(new Error('Upload failed'))

    const result = await syncInstagramData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.totalUploadedCount).toBe(0)
  })
})
