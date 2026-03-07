import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fetchInstagramMedia from './fetch-instagram-data.js'

// Mock dependencies
vi.mock('got', () => ({
  default: vi.fn()
}))

describe('fetchInstagramMedia', () => {
  let mockGot

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()

    // Get mock function
    const got = await import('got')
    mockGot = got.default

    // Set up environment variable
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-instagram-access-token'
  })

  afterEach(() => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN
    vi.restoreAllMocks()
  })

  it('should successfully fetch Instagram media with valid access token', async () => {
    const mockInstagramData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      media: {
        data: [
          {
            id: 'media1',
            ig_id: '123456789',
            media_type: 'IMAGE',
            media_url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            permalink: 'https://www.instagram.com/p/test1/',
            timestamp: '2023-01-01T12:00:00+0000',
            username: 'testuser',
            caption: 'Test caption 1'
          },
          {
            id: 'media2',
            ig_id: '987654321',
            media_type: 'VIDEO',
            media_url: 'https://example.com/video1.mp4',
            thumbnail_url: 'https://example.com/thumb2.jpg',
            permalink: 'https://www.instagram.com/p/test2/',
            timestamp: '2023-01-02T12:00:00+0000',
            username: 'testuser',
            caption: 'Test caption 2'
          }
        ],
        paging: {
          cursors: {
            before: 'before_cursor',
            after: 'after_cursor'
          },
          next: 'https://graph.instagram.com/v12.0/me/media?access_token=...'
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockInstagramData })

    const result = await fetchInstagramMedia()

    // Verify got was called with correct parameters
    expect(mockGot).toHaveBeenCalledWith('me', {
      responseType: 'json',
      prefixUrl: 'https://graph.instagram.com',
      searchParams: {
        access_token: 'test-instagram-access-token',
        fields: [
          'account_type',
          'biography',
          'followers_count',
          'id',
          'media_count',
          'media{caption,children{id,media_url,thumbnail_url},id,ig_id,media_type,media_url,permalink,thumbnail_url,timestamp,username}',
          'username'
        ].join(',')
      }
    })

    // Verify result
    expect(result).toEqual(mockInstagramData)
  })

  it('should handle empty media response', async () => {
    const mockEmptyData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      biography: 'Test bio',
      followers_count: 0,
      media_count: 0,
      media: {
        data: [],
        paging: {
          cursors: {
            before: null,
            after: null
          },
          next: null
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockEmptyData })

    const result = await fetchInstagramMedia()

    expect(result).toEqual(mockEmptyData)
    expect(result.media.data).toEqual([])
  })

  it('should handle request errors', async () => {
    const mockError = new Error('Instagram API error')

    mockGot.mockRejectedValue(mockError)

    await expect(fetchInstagramMedia()).rejects.toThrow('Instagram API error')
  })

  it('should handle malformed response', async () => {
    const mockMalformedData = {
      // Missing expected fields
      error: {
        message: 'Invalid access token',
        type: 'OAuthException',
        code: 190
      }
    }

    mockGot.mockResolvedValue({ body: mockMalformedData })

    const result = await fetchInstagramMedia()

    // Should return the malformed response as-is
    expect(result).toEqual(mockMalformedData)
  })

  it('should handle response with only basic profile data', async () => {
    const mockBasicData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      biography: 'Test bio',
      followers_count: 100,
      media_count: 10
      // Missing media field
    }

    mockGot.mockResolvedValue({ body: mockBasicData })

    const result = await fetchInstagramMedia()

    expect(result).toEqual(mockBasicData)
    expect(result.media).toBeUndefined()
  })

  it('should handle media with children (carousel posts)', async () => {
    const mockCarouselData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      media: {
        data: [
          {
            id: 'media1',
            ig_id: '123456789',
            media_type: 'CAROUSEL_ALBUM',
            media_url: 'https://example.com/image1.jpg',
            thumbnail_url: 'https://example.com/thumb1.jpg',
            permalink: 'https://www.instagram.com/p/test1/',
            timestamp: '2023-01-01T12:00:00+0000',
            username: 'testuser',
            caption: 'Carousel post',
            children: {
              data: [
                {
                  id: 'child1',
                  media_url: 'https://example.com/child1.jpg',
                  thumbnail_url: 'https://example.com/child1_thumb.jpg'
                },
                {
                  id: 'child2',
                  media_url: 'https://example.com/child2.jpg',
                  thumbnail_url: 'https://example.com/child2_thumb.jpg'
                }
              ]
            }
          }
        ],
        paging: {
          cursors: {
            before: 'before_cursor',
            after: 'after_cursor'
          },
          next: null
        }
      }
    }

    mockGot.mockResolvedValue({ body: mockCarouselData })

    const result = await fetchInstagramMedia()

    expect(result).toEqual(mockCarouselData)
    expect(result.media.data[0].children.data).toHaveLength(2)
  })

  it('should handle missing access token environment variable', async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN

    const mockInstagramData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      biography: 'Test bio',
      followers_count: 1000,
      media_count: 50,
      media: {
        data: []
      }
    }

    mockGot.mockResolvedValue({ body: mockInstagramData })

    const result = await fetchInstagramMedia()

    // Should still work but with undefined access token
    expect(mockGot).toHaveBeenCalledWith('me', {
      responseType: 'json',
      prefixUrl: 'https://graph.instagram.com',
      searchParams: {
        access_token: undefined,
        fields: [
          'account_type',
          'biography',
          'followers_count',
          'id',
          'media_count',
          'media{caption,children{id,media_url,thumbnail_url},id,ig_id,media_type,media_url,permalink,thumbnail_url,timestamp,username}',
          'username'
        ].join(',')
      }
    })

    expect(result).toEqual(mockInstagramData)
  })
}) 