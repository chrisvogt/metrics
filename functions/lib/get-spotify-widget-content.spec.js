const { describe, it, expect, beforeEach } = require('vitest')
const { mockFirestore } = require('../test/setup')
const getSpotifyWidgetContent = require('./get-spotify-widget-content')

describe('get-spotify-widget-content', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockFirestore.collection.mockClear()
  })

  it('should transform Firestore timestamp to Date', async () => {
    const mockData = {
      tracks: ['song1', 'song2'],
      meta: {
        synced: {
          _seconds: 1234567890,
          _nanoseconds: 123456789
        },
        count: 2
      }
    }

    // Set up the mock to return our test data
    mockFirestore.collection().doc().get.mockResolvedValue({
      data: () => mockData
    })

    const result = await getSpotifyWidgetContent()

    // Verify Firestore was called correctly
    expect(mockFirestore.collection).toHaveBeenCalledWith('spotify')
    expect(mockFirestore.collection().doc).toHaveBeenCalledWith('widget-content')

    // Verify the timestamp was transformed to a Date
    expect(result.meta.synced).toBeInstanceOf(Date)
    expect(result.meta.synced.getTime()).toBe(1234567890000)

    // Verify the rest of the data was passed through
    expect(result.tracks).toEqual(['song1', 'song2'])
    expect(result.meta.count).toBe(2)
  })

  it('should handle empty meta data', async () => {
    const mockData = {
      tracks: [],
      meta: {
        synced: {
          _seconds: 0,
          _nanoseconds: 0
        },
        count: 0
      }
    }

    mockFirestore.collection().doc().get.mockResolvedValue({
      data: () => mockData
    })

    const result = await getSpotifyWidgetContent()

    expect(result.meta.synced).toBeInstanceOf(Date)
    expect(result.meta.synced.getTime()).toBe(0)
    expect(result.tracks).toEqual([])
    expect(result.meta.count).toBe(0)
  })
}) 