import { describe, it, expect, vi, beforeEach } from 'vitest'
import transformInstagramMedia from './transform-instagram-media.js'

// Mock constants
vi.mock('../constants.js', () => ({
  IMAGE_CDN_BASE_URL: 'https://cdn.example.com'
}))

// Mock toIGDestinationPath
vi.mock('./to-ig-destination-path.js', () => ({
  default: vi.fn((url, id) => `instagram/${id}.jpg`)
}))

import { IMAGE_CDN_BASE_URL } from '../constants.js'
import toIGDestinationPath from './to-ig-destination-path.js'

describe('transformInstagramMedia', () => {
  const mockRawMedia = {
    caption: 'Test caption',
    comments_count: 5,
    id: '123456789',
    like_count: 25,
    media_type: 'IMAGE',
    media_url: 'https://example.com/image.jpg',
    permalink: 'https://instagram.com/p/ABC123/',
    shortcode: 'ABC123',
    thumbnail_url: 'https://example.com/thumb.jpg',
    timestamp: '2023-01-01T00:00:00Z',
    username: 'testuser'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should transform image media correctly', () => {
    const result = transformInstagramMedia(mockRawMedia)

    expect(toIGDestinationPath).toHaveBeenCalledWith('https://example.com/image.jpg', '123456789')
    expect(result).toEqual({
      caption: 'Test caption',
      cdnMediaURL: 'https://cdn.example.cominstagram/123456789.jpg',
      children: undefined,
      commentsCounts: 5,
      id: '123456789',
      likeCount: 25,
      mediaType: 'IMAGE',
      mediaURL: 'https://example.com/image.jpg',
      permalink: 'https://instagram.com/p/ABC123/',
      shortcode: 'ABC123',
      thumbnailURL: 'https://example.com/thumb.jpg',
      timestamp: '2023-01-01T00:00:00Z',
      username: 'testuser'
    })
  })

  it('should transform video media using thumbnail URL', () => {
    const videoMedia = {
      ...mockRawMedia,
      media_type: 'VIDEO'
    }

    const result = transformInstagramMedia(videoMedia)

    expect(toIGDestinationPath).toHaveBeenCalledWith('https://example.com/thumb.jpg', '123456789')
    expect(result.mediaType).toBe('VIDEO')
    expect(result.cdnMediaURL).toBe('https://cdn.example.cominstagram/123456789.jpg')
  })

  it('should transform carousel media with children', () => {
    const carouselMedia = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
      children: {
        data: [
          {
            id: 'child1',
            media_url: 'https://example.com/child1.jpg',
            thumbnail_url: 'https://example.com/child1_thumb.jpg'
          },
          {
            id: 'child2',
            media_url: 'https://example.com/child2.jpg'
          }
        ]
      }
    }

    const result = transformInstagramMedia(carouselMedia)

    expect(result.children).toHaveLength(2)
    expect(result.children[0].cdnMediaURL).toBe('https://cdn.example.cominstagram/child1.jpg')
    expect(result.children[1].cdnMediaURL).toBe('https://cdn.example.cominstagram/child2.jpg')
    expect(toIGDestinationPath).toHaveBeenCalledTimes(3) // Main media + 2 children
  })

  it('should handle carousel media with no children', () => {
    const carouselMedia = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
      children: null
    }

    const result = transformInstagramMedia(carouselMedia)

    expect(result.children).toBeUndefined()
  })

  it('should handle carousel media with empty children array', () => {
    const carouselMedia = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
      children: {
        data: []
      }
    }

    const result = transformInstagramMedia(carouselMedia)

    expect(result.children).toEqual([])
  })

  it('should handle missing optional fields gracefully', () => {
    const minimalMedia = {
      id: '123456789',
      media_type: 'IMAGE',
      media_url: 'https://example.com/image.jpg'
    }

    const result = transformInstagramMedia(minimalMedia)

    expect(result).toEqual({
      caption: undefined,
      cdnMediaURL: 'https://cdn.example.cominstagram/123456789.jpg',
      children: undefined,
      commentsCounts: undefined,
      id: '123456789',
      likeCount: undefined,
      mediaType: 'IMAGE',
      mediaURL: 'https://example.com/image.jpg',
      permalink: undefined,
      shortcode: undefined,
      thumbnailURL: undefined,
      timestamp: undefined,
      username: undefined
    })
  })

  it('should handle media with missing children data property', () => {
    const malformedCarousel = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
      children: {} // Missing data property
    }

    const result = transformInstagramMedia(malformedCarousel)

    expect(result.children).toBeUndefined()
  })

  it('should handle child media with missing thumbnail_url', () => {
    const carouselMedia = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
      children: {
        data: [
          {
            id: 'child1',
            media_url: 'https://example.com/child1.jpg'
            // Missing thumbnail_url
          }
        ]
      }
    }

    const result = transformInstagramMedia(carouselMedia)

    expect(result.children[0].cdnMediaURL).toBe('https://cdn.example.cominstagram/child1.jpg')
    expect(toIGDestinationPath).toHaveBeenCalledWith('https://example.com/child1.jpg', 'child1')
  })

  it('should handle child media with both thumbnail_url and media_url', () => {
    const carouselMedia = {
      ...mockRawMedia,
      media_type: 'CAROUSEL_ALBUM',
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

    const result = transformInstagramMedia(carouselMedia)

    // Should prefer thumbnail_url for children
    expect(toIGDestinationPath).toHaveBeenCalledWith('https://example.com/child1_thumb.jpg', 'child1')
  })

  it('should preserve all original properties', () => {
    const result = transformInstagramMedia(mockRawMedia)

    // Check that all original properties are preserved
    expect(result.caption).toBe(mockRawMedia.caption)
    expect(result.id).toBe(mockRawMedia.id)
    expect(result.mediaType).toBe(mockRawMedia.media_type)
    expect(result.mediaURL).toBe(mockRawMedia.media_url)
    expect(result.permalink).toBe(mockRawMedia.permalink)
    expect(result.shortcode).toBe(mockRawMedia.shortcode)
    expect(result.thumbnailURL).toBe(mockRawMedia.thumbnail_url)
    expect(result.timestamp).toBe(mockRawMedia.timestamp)
    expect(result.username).toBe(mockRawMedia.username)
  })

  it('should handle unknown media types', () => {
    const unknownMedia = {
      ...mockRawMedia,
      media_type: 'UNKNOWN_TYPE'
    }

    const result = transformInstagramMedia(unknownMedia)

    // Should use media_url for unknown types
    expect(toIGDestinationPath).toHaveBeenCalledWith('https://example.com/image.jpg', '123456789')
    expect(result.mediaType).toBe('UNKNOWN_TYPE')
  })
})
