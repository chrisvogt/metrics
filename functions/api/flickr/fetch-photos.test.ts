import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('got', () => ({
  default: vi.fn()
}))
vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn()
  }
}))

let fetchPhotos

describe('fetchPhotos', () => {
  let mockGot
  let mockLogger

  beforeEach(async () => {
    process.env.FLICKR_API_KEY = 'test-flickr-api-key'
    process.env.FLICKR_USER_ID = 'test-flickr-user-id'
    fetchPhotos = (await import('./fetch-photos.js')).default
    vi.clearAllMocks()
    mockGot = (await import('got')).default
    mockLogger = (await import('firebase-functions')).logger
  })

  afterEach(() => {
    delete process.env.FLICKR_API_KEY
    delete process.env.FLICKR_USER_ID
    vi.restoreAllMocks()
  })

  it('should fetch and transform recent photos from Flickr', async () => {
    const mockApiResponse = {
      photos: {
        photo: [
          {
            id: '1',
            title: 'Photo 1',
            description: { _content: 'Desc 1' },
            datetaken: '2023-01-01',
            ownername: 'Owner 1',
            url_q: 'thumb1.jpg',
            url_m: 'med1.jpg',
            url_l: 'large1.jpg'
          },
          {
            id: '2',
            title: 'Photo 2',
            description: {},
            datetaken: '2023-01-02',
            ownername: 'Owner 2',
            url_q: 'thumb2.jpg',
            url_m: 'med2.jpg',
            url_l: 'large2.jpg'
          }
        ],
        total: 2,
        page: 1,
        pages: 1
      }
    }
    mockGot.mockResolvedValue({ body: mockApiResponse })

    const result = await fetchPhotos()

    expect(mockGot).toHaveBeenCalledWith('https://www.flickr.com/services/rest', {
      responseType: 'json',
      searchParams: expect.objectContaining({
        method: 'flickr.people.getPhotos',
        api_key: 'test-flickr-api-key',
        user_id: 'test-flickr-user-id',
        format: 'json',
        nojsoncallback: 1,
        per_page: 12,
        extras: expect.any(String),
        privacy_filter: 1
      })
    })

    expect(result).toEqual({
      photos: [
        {
          id: '1',
          title: 'Photo 1',
          description: 'Desc 1',
          dateTaken: '2023-01-01',
          ownerName: 'Owner 1',
          thumbnailUrl: 'thumb1.jpg',
          mediumUrl: 'med1.jpg',
          largeUrl: 'large1.jpg',
          link: 'https://www.flickr.com/photos/test-flickr-user-id/1'
        },
        {
          id: '2',
          title: 'Photo 2',
          description: '',
          dateTaken: '2023-01-02',
          ownerName: 'Owner 2',
          thumbnailUrl: 'thumb2.jpg',
          mediumUrl: 'med2.jpg',
          largeUrl: 'large2.jpg',
          link: 'https://www.flickr.com/photos/test-flickr-user-id/2'
        }
      ],
      total: 2,
      page: 1,
      pages: 1
    })
  })

  it('should throw if FLICKR_API_KEY is missing', async () => {
    delete process.env.FLICKR_API_KEY
    fetchPhotos = (await import('./fetch-photos.js')).default
    await expect(fetchPhotos()).rejects.toThrow('Missing required Flickr configuration (FLICKR_API_KEY or FLICKR_USER_ID)')
  })

  it('should throw if FLICKR_USER_ID is missing', async () => {
    delete process.env.FLICKR_USER_ID
    fetchPhotos = (await import('./fetch-photos.js')).default
    await expect(fetchPhotos()).rejects.toThrow('Missing required Flickr configuration (FLICKR_API_KEY or FLICKR_USER_ID)')
  })

  it('should throw if API response is missing body', async () => {
    mockGot.mockResolvedValue({ body: undefined })
    await expect(fetchPhotos()).rejects.toThrow('Invalid response from Flickr API')
  })

  it('should throw if API response is missing photos', async () => {
    mockGot.mockResolvedValue({ body: {} })
    await expect(fetchPhotos()).rejects.toThrow('Invalid response from Flickr API')
  })

  it('should throw if API response is missing photos.photo', async () => {
    mockGot.mockResolvedValue({ body: { photos: {} } })
    await expect(fetchPhotos()).rejects.toThrow('Invalid response from Flickr API')
  })

  it('should log and rethrow errors from got', async () => {
    const error = new Error('Network error')
    mockGot.mockRejectedValue(error)
    await expect(fetchPhotos()).rejects.toThrow('Network error')
    expect(mockLogger.error).toHaveBeenCalledWith('Error fetching Flickr photos:', error)
  })
}) 