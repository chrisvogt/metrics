import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock pMap
vi.mock('p-map', () => ({
  default: vi.fn()
}))

// Mock fetchReleaseDetails
vi.mock('./fetch-release-details.js', () => ({
  default: vi.fn()
}))

// Mock filterDiscogsResource
vi.mock('../../transformers/filter-discogs-resource.js', () => ({
  default: vi.fn()
}))

describe('fetchReleasesBatch', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should fetch detailed data for all releases with URLs', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    const filterDiscogsResource = (await import('../../transformers/filter-discogs-resource.js')).default
    const pMap = (await import('p-map')).default

    const mockReleases = [
      {
        id: 1,
        basic_information: {
          id: 1,
          resource_url: 'https://api.discogs.com/releases/1',
          title: 'Release 1'
        }
      },
      {
        id: 2,
        basic_information: {
          id: 2,
          resource_url: 'https://api.discogs.com/releases/2',
          title: 'Release 2'
        }
      }
    ]

    const mockDetailedData1 = { id: 1, title: 'Release 1', genres: ['Rock'] }
    const mockDetailedData2 = { id: 2, title: 'Release 2', genres: ['Pop'] }
    const mockFilteredData1 = { id: 1, title: 'Release 1', genres: ['Rock'] }
    const mockFilteredData2 = { id: 2, title: 'Release 2', genres: ['Pop'] }

    fetchReleaseDetails
      .mockResolvedValueOnce(mockDetailedData1)
      .mockResolvedValueOnce(mockDetailedData2)

    filterDiscogsResource
      .mockReturnValueOnce(mockFilteredData1)
      .mockReturnValueOnce(mockFilteredData2)

    pMap.mockImplementation(async (items, mapper, options) => {
      const results = []
      for (const item of items) {
        const result = await mapper(item)
        results.push(result)
      }
      return results
    })

    const result = await fetchReleasesBatch(mockReleases)

    expect(pMap).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      { concurrency: 5, stopOnError: false }
    )

    expect(result).toHaveLength(2)
    expect(result[0].resource).toEqual(mockFilteredData1)
    expect(result[1].resource).toEqual(mockFilteredData2)
  })

  it('should handle releases without URLs', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const pMap = (await import('p-map')).default

    const mockReleases = [
      {
        id: 1,
        basic_information: {
          id: 1,
          title: 'Release 1'
          // No resource_url or master_url
        }
      }
    ]

    const result = await fetchReleasesBatch(mockReleases)

    // When no releases have resource_url, pMap should not be called
    expect(pMap).not.toHaveBeenCalled()
    expect(result).toEqual(mockReleases)
  })

  it('should handle failed fetch requests gracefully', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    const pMap = (await import('p-map')).default

    const mockReleases = [
      {
        id: 1,
        basic_information: {
          id: 1,
          resource_url: 'https://api.discogs.com/releases/1',
          title: 'Release 1'
        }
      }
    ]

    fetchReleaseDetails.mockResolvedValueOnce(null) // Simulate failed fetch

    pMap.mockImplementation(async (items, mapper, options) => {
      const results = []
      for (const item of items) {
        const result = await mapper(item)
        results.push(result)
      }
      return results
    })

    const result = await fetchReleasesBatch(mockReleases)

    expect(result).toHaveLength(1)
    expect(result[0].resource).toBeUndefined()
  })

  it('should use custom concurrency and stopOnError options', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const pMap = (await import('p-map')).default

    const mockReleases = [
      {
        id: 1,
        basic_information: {
          id: 1,
          resource_url: 'https://api.discogs.com/releases/1',
          title: 'Release 1'
        }
      }
    ]

    pMap.mockResolvedValueOnce([])

    await fetchReleasesBatch(mockReleases, { concurrency: 10, stopOnError: true })

    expect(pMap).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      { concurrency: 10, stopOnError: true }
    )
  })

  it('should handle empty releases array', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const pMap = (await import('p-map')).default

    const result = await fetchReleasesBatch([])

    expect(result).toEqual([])
    // When no releases, pMap should not be called
    expect(pMap).not.toHaveBeenCalled()
  })
})
