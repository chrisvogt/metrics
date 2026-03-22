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
    process.env.INSTAGRAM_USER_ID = '123456789'
  })

  afterEach(() => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN
    delete process.env.INSTAGRAM_USER_ID
    vi.restoreAllMocks()
  })

  it('should successfully fetch Instagram media with valid access token', async () => {
    const mockProfileData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      followers_count: 1000,
      follows_count: 250,
      media_count: 50,
    }
    const mockMediaData = {
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
        next: 'https://graph.instagram.com/v25.0/123456789/media?access_token=...'
      }
    }

    mockGot
      .mockResolvedValueOnce({ body: mockProfileData })
      .mockResolvedValueOnce({ body: mockMediaData })

    const result = await fetchInstagramMedia()

    expect(mockGot).toHaveBeenNthCalledWith(
      1,
      'https://graph.instagram.com/v25.0/me?access_token=test-instagram-access-token&fields=id,user_id,username,account_type,profile_picture_url,followers_count,follows_count,media_count',
      {
        responseType: 'json',
      }
    )
    expect(mockGot).toHaveBeenNthCalledWith(
      2,
      'https://graph.instagram.com/v25.0/123456789/media?access_token=test-instagram-access-token&limit=24&fields=alt_text,caption,children{alt_text,id,media_url,thumbnail_url},comments_count,id,ig_id,like_count,media_type,media_url,permalink,thumbnail_url,timestamp,username',
      {
        responseType: 'json',
      }
    )
    expect(result).toEqual({
      ...mockProfileData,
      media: mockMediaData,
    })
  })

  it('should handle empty media response', async () => {
    const mockProfileData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      followers_count: 0,
      media_count: 0,
    }
    const mockMediaData = {
      data: [],
      paging: {
        cursors: {
          before: null,
          after: null
        },
        next: null
      }
    }

    mockGot
      .mockResolvedValueOnce({ body: mockProfileData })
      .mockResolvedValueOnce({ body: mockMediaData })

    const result = await fetchInstagramMedia()

    expect(result).toEqual({
      ...mockProfileData,
      media: mockMediaData,
    })
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

    mockGot
      .mockResolvedValueOnce({ body: mockMalformedData })
      .mockResolvedValueOnce({ body: undefined })

    const result = await fetchInstagramMedia()

    expect(result).toEqual({
      ...mockMalformedData,
      media: undefined,
    })
  })

  it('should handle response with only basic profile data', async () => {
    const mockBasicData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      followers_count: 100,
      media_count: 10
    }

    mockGot
      .mockResolvedValueOnce({ body: mockBasicData })
      .mockResolvedValueOnce({ body: undefined })

    const result = await fetchInstagramMedia()

    expect(result).toEqual({
      ...mockBasicData,
      media: undefined,
    })
    expect(result.media).toBeUndefined()
  })

  it('should handle media with children (carousel posts)', async () => {
    const mockProfileData = {
      id: '123456789',
      username: 'testuser',
      account_type: 'PERSONAL',
      followers_count: 1000,
      media_count: 50,
    }
    const mockMediaData = {
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

    mockGot
      .mockResolvedValueOnce({ body: mockProfileData })
      .mockResolvedValueOnce({ body: mockMediaData })

    const result = await fetchInstagramMedia()

    expect(result).toEqual({
      ...mockProfileData,
      media: mockMediaData,
    })
    expect(result.media.data[0].children.data).toHaveLength(2)
  })

  it('should handle missing access token environment variable', async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN

    await expect(fetchInstagramMedia()).rejects.toThrow(
      'Missing INSTAGRAM_ACCESS_TOKEN environment variable.'
    )
  })
}) 