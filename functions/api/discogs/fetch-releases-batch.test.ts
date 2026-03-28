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

describe('discogsReleaseLabel', () => {
  it('uses a fallback title when missing, non-string, or whitespace', async () => {
    const { discogsReleaseLabel } = await import('./fetch-releases-batch.js')
    expect(discogsReleaseLabel({ id: 42, basic_information: {} })).toContain('Release 42')
    expect(discogsReleaseLabel({ id: 43, basic_information: { title: '   ' } })).toContain('Release 43')
    expect(discogsReleaseLabel({ id: 44, basic_information: { title: 12 as unknown as string } })).toContain(
      'Release 44',
    )
  })

  it('truncates titles longer than 72 characters', async () => {
    const { discogsReleaseLabel } = await import('./fetch-releases-batch.js')
    const long = 'x'.repeat(80)
    const label = discogsReleaseLabel({ id: 1, basic_information: { title: long } })
    expect(label).toHaveLength(70) // 69 chars + ellipsis
    expect(label.endsWith('…')).toBe(true)
  })
})

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

    pMap.mockImplementation(async (items, mapper) => {
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

    pMap.mockImplementation(async (items, mapper) => {
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

  it('should handle errors in the mapper function gracefully', async () => {
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

    // Mock fetchReleaseDetails to throw an error
    fetchReleaseDetails.mockRejectedValueOnce(new Error('Network error'))

    pMap.mockImplementation(async (items, mapper) => {
      const results = []
      for (const item of items) {
        const result = await mapper(item)
        results.push(result)
      }
      return results
    })

    const result = await fetchReleasesBatch(mockReleases)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(mockReleases[0]) // Should return original release on error
  })

  it('calls onProgress for batch and per-release steps when tasks run', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    const filterDiscogsResource = (await import('../../transformers/filter-discogs-resource.js')).default
    const pMap = (await import('p-map')).default
    const onProgress = vi.fn()

    const mockReleases = [
      {
        basic_information: {
          id: 7,
          resource_url: 'https://api.discogs.com/releases/7',
          title: 'Seven',
        },
      },
    ]

    fetchReleaseDetails.mockResolvedValueOnce({ ok: true })
    filterDiscogsResource.mockReturnValueOnce({ filtered: true })

    pMap.mockImplementation(async (items, mapper) => {
      const results = []
      for (let i = 0; i < items.length; i++) {
        results.push(await mapper(items[i], i))
      }
      return results
    })

    await fetchReleasesBatch(mockReleases, { onProgress })

    expect(onProgress.mock.calls.map((c) => c[0].phase)).toEqual(['discogs.batch', 'discogs.release'])
  })

  it('uses basic_information.id when top-level id is absent', async () => {
    const fetchReleasesBatch = (await import('./fetch-releases-batch.js')).default
    const fetchReleaseDetails = (await import('./fetch-release-details.js')).default
    const filterDiscogsResource = (await import('../../transformers/filter-discogs-resource.js')).default
    const pMap = (await import('p-map')).default

    const mockReleases = [
      {
        basic_information: {
          id: 99,
          resource_url: 'https://api.discogs.com/releases/99',
          title: 'Ninety-nine',
        },
      },
    ]

    fetchReleaseDetails.mockResolvedValueOnce({ id: 99 })
    filterDiscogsResource.mockReturnValueOnce({ id: 99 })

    pMap.mockImplementation(async (items, mapper) => {
      const results = []
      for (const item of items) {
        results.push(await mapper(item))
      }
      return results
    })

    const result = await fetchReleasesBatch(mockReleases)
    expect(result[0]).toMatchObject({ resource: { id: 99 } })
  })

  it('should apply delay when index > 0 and delayMs > 0', async () => {
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

    // Use fake timers to test the delay
    vi.useFakeTimers()

    // Mock pMap to properly pass the index parameter to the mapper function
    pMap.mockImplementation(async (items, mapper) => {
      const results = []
      for (let i = 0; i < items.length; i++) {
        const result = await mapper(items[i], i) // Pass the index as second parameter
        results.push(result)
      }
      return results
    })

    const promise = fetchReleasesBatch(mockReleases, { delayMs: 1000 })
    
    // Fast-forward through any timers
    await vi.runAllTimersAsync()
    
    const result = await promise

    vi.useRealTimers()

    expect(result).toHaveLength(2)
    expect(result[0].resource).toEqual(mockFilteredData1)
    expect(result[1].resource).toEqual(mockFilteredData2)
  })
})
