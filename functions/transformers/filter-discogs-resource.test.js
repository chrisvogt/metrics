import { describe, it, expect } from 'vitest'
import filterDiscogsResource from './filter-discogs-resource.js'

describe('filterDiscogsResource', () => {
  it('should return null for null input', () => {
    const result = filterDiscogsResource(null)
    expect(result).toBeNull()
  })

  it('should return null for undefined input', () => {
    const result = filterDiscogsResource(undefined)
    expect(result).toBeNull()
  })

  it('should filter resource data to only include allowed fields', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      year: 2023,
      country: 'US',
      released: '2023-01-01',
      released_formatted: '01 Jan 2023',
      status: 'Accepted',
      data_quality: 'Correct',
      artists: [
        { name: 'Artist 1', role: 'Main' },
        { name: 'Artist 2', role: 'Featuring' }
      ],
      extraartists: [
        { name: 'Producer', role: 'Producer' }
      ],
      labels: [
        { name: 'Test Label', catno: 'TL001' }
      ],
      companies: [
        { name: 'Test Company', role: 'Distributed By' }
      ],
      formats: [
        { name: 'Vinyl', qty: '1' }
      ],
      tracklist: [
        { position: 'A1', title: 'Track 1', duration: '3:45' }
      ],
      genres: ['Rock', 'Alternative'],
      styles: ['Indie Rock', 'Alternative Rock'],
      identifiers: [
        { type: 'Barcode', value: '123456789' }
      ],
      images: [
        { uri: 'https://example.com/image1.jpg' },
        { uri: 'https://example.com/image2.jpg' }
      ],
      notes: 'Test release notes',
      uri: 'https://api.discogs.com/releases/12345',
      resource_url: 'https://api.discogs.com/releases/12345',
      master_id: 67890,
      master_url: 'https://api.discogs.com/masters/67890',
      main_release: 12345,
      main_release_url: 'https://api.discogs.com/releases/12345',
      // Extra fields that should be filtered out
      extra_field: 'should be removed',
      another_field: 'should also be removed'
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result).toEqual({
      id: 12345,
      title: 'Test Album',
      year: 2023,
      country: 'US',
      released: '2023-01-01',
      released_formatted: '01 Jan 2023',
      status: 'Accepted',
      data_quality: 'Correct',
      tracklist: [
        { position: 'A1', title: 'Track 1', duration: '3:45' }
      ],
      genres: ['Rock', 'Alternative'],
      styles: ['Indie Rock', 'Alternative Rock'],
      notes: 'Test release notes',
      uri: 'https://api.discogs.com/releases/12345',
      resource_url: 'https://api.discogs.com/releases/12345',
      master_id: 67890,
      master_url: 'https://api.discogs.com/masters/67890',
      main_release: 12345,
      main_release_url: 'https://api.discogs.com/releases/12345'
    })

    // Verify excluded fields are not present
    expect(result.artists).toBeUndefined()
    expect(result.extraartists).toBeUndefined()
    expect(result.labels).toBeUndefined()
    expect(result.companies).toBeUndefined()
    expect(result.formats).toBeUndefined()
    expect(result.identifiers).toBeUndefined()
    expect(result.images).toBeUndefined()
    expect(result.extra_field).toBeUndefined()
    expect(result.another_field).toBeUndefined()
  })

  it('should handle nested objects correctly', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      tracklist: [
        {
          position: 'A1',
          title: 'Track 1',
          duration: '3:45',
          extra_info: 'should be removed'
        },
        {
          position: 'A2',
          title: 'Track 2',
          duration: '4:12',
          extra_info: 'should be removed'
        }
      ],
      genres: ['Rock'],
      styles: ['Alternative']
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result.tracklist).toEqual([
      {
        position: 'A1',
        title: 'Track 1',
        duration: '3:45'
      },
      {
        position: 'A2',
        title: 'Track 2',
        duration: '4:12'
      }
    ])

    // Verify extra_info is filtered out from nested objects
    expect(result.tracklist[0].extra_info).toBeUndefined()
    expect(result.tracklist[1].extra_info).toBeUndefined()
  })

  it('should handle arrays of objects correctly', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      tracklist: [
        { position: 'A1', title: 'Track 1', duration: '3:45' },
        { position: 'A2', title: 'Track 2', duration: '4:12' }
      ],
      genres: ['Rock', 'Alternative'],
      styles: ['Indie Rock']
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result.tracklist).toHaveLength(2)
    expect(result.tracklist[0]).toEqual({ position: 'A1', title: 'Track 1', duration: '3:45' })
    expect(result.tracklist[1]).toEqual({ position: 'A2', title: 'Track 2', duration: '4:12' })
    expect(result.genres).toEqual(['Rock', 'Alternative'])
    expect(result.styles).toEqual(['Indie Rock'])
  })

  it('should handle primitive values correctly', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      year: 2023,
      country: 'US',
      notes: 'Test notes'
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result.id).toBe(12345)
    expect(result.title).toBe('Test Album')
    expect(result.year).toBe(2023)
    expect(result.country).toBe('US')
    expect(result.notes).toBe('Test notes')
  })

  it('should handle empty object', () => {
    const result = filterDiscogsResource({})
    expect(result).toEqual({})
  })

  it('should handle object with only excluded fields', () => {
    const mockResourceData = {
      artists: [{ name: 'Artist 1' }],
      labels: [{ name: 'Label 1' }],
      companies: [{ name: 'Company 1' }],
      formats: [{ name: 'Vinyl' }],
      identifiers: [{ type: 'Barcode' }],
      images: [{ uri: 'https://example.com/image.jpg' }],
      extra_field: 'should be removed'
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result).toEqual({})
  })

  it('should handle mixed allowed and excluded fields', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      artists: [{ name: 'Artist 1' }], // Should be excluded
      genres: ['Rock'], // Should be included
      labels: [{ name: 'Label 1' }], // Should be excluded
      styles: ['Alternative'], // Should be included
      extra_field: 'should be removed' // Should be excluded
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result).toEqual({
      id: 12345,
      title: 'Test Album',
      genres: ['Rock'],
      styles: ['Alternative']
    })
  })

  it('should handle nested arrays correctly', () => {
    const mockResourceData = {
      id: 12345,
      title: 'Test Album',
      tracklist: [
        {
          position: 'A1',
          title: 'Track 1',
          duration: '3:45',
          artists: [
            { name: 'Artist 1', role: 'Main' },
            { name: 'Artist 2', role: 'Featuring' }
          ]
        }
      ],
      genres: ['Rock']
    }

    const result = filterDiscogsResource(mockResourceData)

    expect(result.tracklist[0]).toEqual({
      position: 'A1',
      title: 'Track 1',
      duration: '3:45'
    })

    // Verify nested artists array is filtered out
    expect(result.tracklist[0].artists).toBeUndefined()
  })
})
