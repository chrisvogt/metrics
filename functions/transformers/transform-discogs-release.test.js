import { describe, it, expect, vi } from 'vitest'
import transformDiscogsRelease from './transform-discogs-release.js'

// Mock the constants
vi.mock('../constants.js', () => ({
  IMAGE_CDN_BASE_URL: 'https://cdn.example.com/'
}))

// Mock the destination path transformer
vi.mock('./to-discogs-destination-path.js', () => ({
  default: vi.fn((imageURL, releaseId, imageType) => `chrisvogt/discogs/${releaseId}_${imageType}.jpeg`)
}))

describe('transformDiscogsRelease', () => {
  it('should transform a release with all fields', () => {
    const rawRelease = {
      id: 28461454,
      instance_id: 2045415075,
      date_added: '2025-07-27T23:34:53-07:00',
      rating: 0,
      basic_information: {
        id: 28461454,
        master_id: 3255691,
        master_url: 'https://api.discogs.com/masters/3255691',
        resource_url: 'https://api.discogs.com/releases/28461454',
        thumb: 'https://i.discogs.com/gZkev980p_Lvv3FiNfXLxdpUVM5huRUc-bwsKnpinr0/rs:fit/g:sm/q:40/h:150/w:150/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg',
        cover_image: 'https://i.discogs.com/iejysiuZZMMScKhszIck7jmzKUomj1nqDmfpICMPAjw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg',
        title: 'The Rise & Fall Of A Midwest Princess',
        year: 2023,
        formats: [
          {
            name: 'Vinyl',
            qty: '1',
            descriptions: ['LP']
          }
        ],
        labels: [
          {
            name: 'Amusement Records (3)',
            catno: 'B0038014-01',
            entity_type: '1',
            entity_type_name: 'Label',
            id: 3589090,
            resource_url: 'https://api.discogs.com/labels/3589090'
          }
        ],
        artists: [
          {
            name: 'Chappell Roan',
            anv: '',
            join: '',
            role: '',
            tracks: '',
            id: 6360106,
            resource_url: 'https://api.discogs.com/artists/6360106'
          }
        ],
        genres: ['Pop'],
        styles: ['Indie Pop']
      },
      folder_id: 1,
      notes: [
        {
          field_id: 1,
          value: 'Mint (M)'
        }
      ]
    }

    const result = transformDiscogsRelease(rawRelease)

    expect(result).toEqual({
      id: 28461454,
      instanceId: 2045415075,
      dateAdded: '2025-07-27T23:34:53-07:00',
      rating: 0,
      folderId: 1,
      notes: [
        {
          field_id: 1,
          value: 'Mint (M)'
        }
      ],
      basicInformation: {
        id: 28461454,
        masterId: 3255691,
        masterUrl: 'https://api.discogs.com/masters/3255691',
        resourceUrl: 'https://api.discogs.com/releases/28461454',
        thumb: 'https://i.discogs.com/gZkev980p_Lvv3FiNfXLxdpUVM5huRUc-bwsKnpinr0/rs:fit/g:sm/q:40/h:150/w:150/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg',
        coverImage: 'https://i.discogs.com/iejysiuZZMMScKhszIck7jmzKUomj1nqDmfpICMPAjw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg',
        cdnThumbUrl: 'https://cdn.example.com/chrisvogt/discogs/28461454_thumb.jpeg',
        cdnCoverUrl: 'https://cdn.example.com/chrisvogt/discogs/28461454_cover.jpeg',
        title: 'The Rise & Fall Of A Midwest Princess',
        year: 2023,
        formats: [
          {
            name: 'Vinyl',
            qty: '1',
            descriptions: ['LP']
          }
        ],
        labels: [
          {
            name: 'Amusement Records (3)',
            catno: 'B0038014-01',
            entity_type: '1',
            entity_type_name: 'Label',
            id: 3589090,
            resource_url: 'https://api.discogs.com/labels/3589090'
          }
        ],
        artists: [
          {
            name: 'Chappell Roan',
            anv: '',
            join: '',
            role: '',
            tracks: '',
            id: 6360106,
            resource_url: 'https://api.discogs.com/artists/6360106'
          }
        ],
        genres: ['Pop'],
        styles: ['Indie Pop']
      }
    })
  })

  it('should handle releases without notes', () => {
    const rawRelease = {
      id: 123,
      instance_id: 456,
      date_added: '2025-01-01T00:00:00-00:00',
      rating: 5,
      basic_information: {
        id: 123,
        master_id: 789,
        master_url: 'https://api.discogs.com/masters/789',
        resource_url: 'https://api.discogs.com/releases/123',
        thumb: 'https://example.com/thumb.jpg',
        cover_image: 'https://example.com/cover.jpg',
        title: 'Test Album',
        year: 2024,
        formats: [],
        labels: [],
        artists: [],
        genres: [],
        styles: []
      },
      folder_id: 2
    }

    const result = transformDiscogsRelease(rawRelease)

    expect(result.notes).toBeUndefined()
    expect(result.id).toBe(123)
    expect(result.basicInformation.title).toBe('Test Album')
  })

  it('should handle releases without images', () => {
    const rawRelease = {
      id: 123,
      instance_id: 456,
      date_added: '2025-01-01T00:00:00-00:00',
      rating: 0,
      basic_information: {
        id: 123,
        master_id: 789,
        master_url: 'https://api.discogs.com/masters/789',
        resource_url: 'https://api.discogs.com/releases/123',
        thumb: null,
        cover_image: null,
        title: 'Test Album',
        year: 2024,
        formats: [],
        labels: [],
        artists: [],
        genres: [],
        styles: []
      },
      folder_id: 1
    }

    const result = transformDiscogsRelease(rawRelease)

    expect(result.basicInformation.cdnThumbUrl).toBeNull()
    expect(result.basicInformation.cdnCoverUrl).toBeNull()
    expect(result.basicInformation.thumb).toBeNull()
    expect(result.basicInformation.coverImage).toBeNull()
  })
}) 