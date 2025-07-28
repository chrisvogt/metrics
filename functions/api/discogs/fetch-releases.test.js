import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fetchDiscogsReleases from './fetch-releases.js'

// Mock fetch
global.fetch = vi.fn()

// Mock firebase-functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('fetchDiscogsReleases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DISCOGS_API_KEY = 'test-api-key'
    process.env.DISCOGS_USERNAME = 'testuser'
  })

  afterEach(() => {
    delete process.env.DISCOGS_API_KEY
    delete process.env.DISCOGS_USERNAME
  })

  it('should successfully fetch releases from single page', async () => {
    const mockResponse = {
      pagination: {
        page: 1,
        pages: 1,
        per_page: 50,
        items: 2
      },
      releases: [
        {
          id: 28461454,
          basic_information: {
            id: 28461454,
            title: 'The Rise & Fall Of A Midwest Princess',
            year: 2023,
            thumb: 'https://example.com/thumb1.jpg',
            cover_image: 'https://example.com/cover1.jpg',
            artists: [{ name: 'Chappell Roan' }]
          }
        },
        {
          id: 33129744,
          basic_information: {
            id: 33129744,
            title: 'Brat And It\'s Completely Different',
            year: 2025,
            thumb: 'https://example.com/thumb2.jpg',
            cover_image: 'https://example.com/cover2.jpg',
            artists: [{ name: 'Charli XCX' }]
          }
        }
      ]
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchDiscogsReleases()

    expect(fetch).toHaveBeenCalledWith(
      'https://api.discogs.com/users/testuser/collection/folders/0/releases?token=test-api-key&page=1&per_page=50',
      {
        headers: {
          'User-Agent': 'MetricsApp/1.0'
        }
      }
    )

    expect(result).toEqual({
      pagination: {
        page: 1,
        pages: 1,
        per_page: 2,
        items: 2,
        urls: {}
      },
      releases: mockResponse.releases
    })
  })

  it('should handle multiple pages and concatenate results', async () => {
    const page1Response = {
      pagination: { page: 1, pages: 2, per_page: 1, items: 2 },
      releases: [{ id: 1, basic_information: { title: 'Album 1' } }]
    }

    const page2Response = {
      pagination: { page: 2, pages: 2, per_page: 1, items: 2 },
      releases: [{ id: 2, basic_information: { title: 'Album 2' } }]
    }

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1Response
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2Response
      })

    const result = await fetchDiscogsReleases()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(result.releases).toHaveLength(2)
    expect(result.pagination.items).toBe(2)
    expect(result.releases[0].id).toBe(1)
    expect(result.releases[1].id).toBe(2)
  })

  it('should throw error when API key is missing', async () => {
    delete process.env.DISCOGS_API_KEY

    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME'
    )

    expect(fetch).not.toHaveBeenCalled()
  })

  it('should throw error when username is missing', async () => {
    delete process.env.DISCOGS_USERNAME

    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME'
    )

    expect(fetch).not.toHaveBeenCalled()
  })

  it('should handle API error responses', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Discogs API error: 401 Unauthorized'
    )
  })

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchDiscogsReleases()).rejects.toThrow('Network error')
  })
}) 