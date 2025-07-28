import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock firebase-functions logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

vi.mock('firebase-functions', () => ({
  logger: mockLogger
}))

describe('fetchDiscogsReleases', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    if (typeof global.fetch === 'function' && global.fetch.mockReset) {
      global.fetch.mockReset()
    }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should successfully fetch releases from single page', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
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

    // Verify logger.info was called
    expect(mockLogger.info).toHaveBeenCalledWith('Fetching Discogs releases page 1')
  })

  it('should handle multiple pages and concatenate results', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
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

    // Verify logger.info was called for both pages
    expect(mockLogger.info).toHaveBeenCalledWith('Fetching Discogs releases page 1')
    expect(mockLogger.info).toHaveBeenCalledWith('Fetching Discogs releases page 2')
  })

  it('should throw error when API key is missing', async () => {
    // Only set username, not API key
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME'
    )
  })

  it('should throw error when username is missing', async () => {
    // Only set API key, not username
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME'
    )
  })

  it('should throw error when both API key and username are missing', async () => {
    // Don't set any environment variables
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME'
    )
  })

  it('should handle API error responses', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    await expect(fetchDiscogsReleases()).rejects.toThrow(
      'Discogs API error: 401 Unauthorized'
    )

    // Verify logger.error was called
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to fetch Discogs releases',
      expect.any(Error)
    )
  })

  it('should handle network errors', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
    const networkError = new Error('Network error')
    fetch.mockRejectedValueOnce(networkError)

    await expect(fetchDiscogsReleases()).rejects.toThrow('Network error')

    // Verify logger.error was called
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to fetch Discogs releases',
      networkError
    )
  })

  it('should handle JSON parsing errors', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
    const jsonError = new Error('Invalid JSON')
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw jsonError }
    })

    await expect(fetchDiscogsReleases()).rejects.toThrow('Invalid JSON')

    // Verify logger.error was called
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to fetch Discogs releases',
      jsonError
    )
  })

  it('should handle empty releases array', async () => {
    // Set environment variables BEFORE importing the module
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    vi.stubEnv('DISCOGS_USERNAME', 'testuser')
    
    const fetchDiscogsReleases = (await import('./fetch-releases.js')).default
    
    const mockResponse = {
      pagination: {
        page: 1,
        pages: 1,
        per_page: 50,
        items: 0
      },
      releases: []
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const result = await fetchDiscogsReleases()

    expect(result).toEqual({
      pagination: {
        page: 1,
        pages: 1,
        per_page: 0,
        items: 0,
        urls: {}
      },
      releases: []
    })
  })
}) 