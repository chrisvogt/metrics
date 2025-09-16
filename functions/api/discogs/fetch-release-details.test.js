import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('fetchReleaseDetails', () => {
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

  it('should successfully fetch release details', async () => {
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    
    const mockReleaseData = {
      id: 28461454,
      title: 'The Rise & Fall Of A Midwest Princess',
      year: 2023,
      artists: [{ name: 'Chappell Roan' }],
      labels: [{ name: 'Island Records' }],
      genres: ['Pop'],
      styles: ['Indie Pop']
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReleaseData
    })

    const result = await fetchReleaseDetails('https://api.discogs.com/releases/28461454', '28461454')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.discogs.com/releases/28461454?token=test-api-key',
      {
        headers: {
          'User-Agent': 'MetricsApp/1.0'
        }
      }
    )

    expect(result).toEqual(mockReleaseData)
  })

  it('should handle URLs that already contain token parameter', async () => {
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    
    const mockReleaseData = { id: 123, title: 'Test Release' }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReleaseData
    })

    const result = await fetchReleaseDetails('https://api.discogs.com/releases/123?token=existing-token', '123')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.discogs.com/releases/123?token=existing-token',
      {
        headers: {
          'User-Agent': 'MetricsApp/1.0'
        }
      }
    )

    expect(result).toEqual(mockReleaseData)
  })

  it('should return null when API request fails', async () => {
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    const result = await fetchReleaseDetails('https://api.discogs.com/releases/999999', '999999')

    expect(result).toBeNull()
  })

  it('should return null when fetch throws an error', async () => {
    vi.stubEnv('DISCOGS_API_KEY', 'test-api-key')
    
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default

    fetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await fetchReleaseDetails('https://api.discogs.com/releases/123', '123')

    expect(result).toBeNull()
  })

  it('should throw error when DISCOGS_API_KEY is missing', async () => {
    vi.unstubAllEnvs()
    
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default

    await expect(fetchReleaseDetails('https://api.discogs.com/releases/123', '123'))
      .rejects.toThrow('Missing required environment variable: DISCOGS_API_KEY')
  })
})
