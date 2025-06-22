import { describe, it, expect } from 'vitest'
import trackToCollectionItem from '../transformers/track-to-collection-item'

describe('trackToCollectionItem', () => {
  it('should transform a complete track object correctly', () => {
    const mockTrack = {
      id: 'track123',
      name: 'Test Song',
      type: 'track',
      uri: 'spotify:track:track123',
      preview_url: 'https://preview.example.com/track123',
      external_urls: {
        spotify: 'https://open.spotify.com/track/track123'
      },
      artists: [
        { name: 'Artist 1' },
        { name: 'Artist 2' }
      ],
      album: {
        images: [
          { url: 'https://image1.jpg', width: 300, height: 300 },
          { url: 'https://image2.jpg', width: 64, height: 64 }
        ]
      }
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result).toEqual({
      id: 'track123',
      name: 'Test Song',
      type: 'track',
      uri: 'spotify:track:track123',
      previewURL: 'https://preview.example.com/track123',
      spotifyURL: 'https://open.spotify.com/track/track123',
      artists: ['Artist 1', 'Artist 2'],
      albumImages: [
        { url: 'https://image1.jpg', width: 300, height: 300 },
        { url: 'https://image2.jpg', width: 64, height: 64 }
      ]
    })
  })

  it('should handle track with missing optional properties', () => {
    const mockTrack = {
      id: 'track456',
      name: 'Simple Song',
      type: 'track',
      uri: 'spotify:track:track456',
      artists: [{ name: 'Solo Artist' }],
      album: {}
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result).toEqual({
      id: 'track456',
      name: 'Simple Song',
      type: 'track',
      uri: 'spotify:track:track456',
      previewURL: undefined,
      spotifyURL: undefined,
      artists: ['Solo Artist'],
      albumImages: []
    })
  })

  it('should handle track with missing external_urls', () => {
    const mockTrack = {
      id: 'track789',
      name: 'No External URLs',
      type: 'track',
      uri: 'spotify:track:track789',
      artists: [{ name: 'Test Artist' }],
      album: { images: [] }
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result.spotifyURL).toBeUndefined()
    expect(result.previewURL).toBeUndefined()
  })

  it('should handle track with missing album images', () => {
    const mockTrack = {
      id: 'track101',
      name: 'No Album Images',
      type: 'track',
      uri: 'spotify:track:track101',
      artists: [{ name: 'Test Artist' }],
      album: {}
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result.albumImages).toEqual([])
  })

  it('should handle track with multiple artists', () => {
    const mockTrack = {
      id: 'track202',
      name: 'Collaboration Song',
      type: 'track',
      uri: 'spotify:track:track202',
      artists: [
        { name: 'Artist A' },
        { name: 'Artist B' },
        { name: 'Artist C' }
      ],
      album: { images: [] }
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result.artists).toEqual(['Artist A', 'Artist B', 'Artist C'])
  })

  it('should handle track with no artists', () => {
    const mockTrack = {
      id: 'track303',
      name: 'Unknown Artist Song',
      type: 'track',
      uri: 'spotify:track:track303',
      artists: [],
      album: { images: [] }
    }

    const result = trackToCollectionItem(mockTrack)

    expect(result.artists).toEqual([])
  })
}) 