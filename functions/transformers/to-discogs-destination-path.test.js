import { describe, it, expect } from 'vitest'
import toDiscogsDestinationPath from './to-discogs-destination-path.js'

describe('toDiscogsDestinationPath', () => {
  it('should generate correct path for thumb image', () => {
    const imageURL = 'https://i.discogs.com/gZkev980p_Lvv3FiNfXLxdpUVM5huRUc-bwsKnpinr0/rs:fit/g:sm/q:40/h:150/w:150/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg'
    const releaseId = '28461454'
    
    const result = toDiscogsDestinationPath(imageURL, releaseId, 'thumb')
    
    expect(result).toBe('chrisvogt/discogs/28461454_thumb.jpeg')
  })

  it('should generate correct path for cover image', () => {
    const imageURL = 'https://i.discogs.com/iejysiuZZMMScKhszIck7jmzKUomj1nqDmfpICMPAjw/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4NDYx/NDU0LTE3MTYzNDU0/OTAtNjg5OC5qcGVn.jpeg'
    const releaseId = '28461454'
    
    const result = toDiscogsDestinationPath(imageURL, releaseId, 'cover')
    
    expect(result).toBe('chrisvogt/discogs/28461454_cover.jpeg')
  })

  it('should handle different file extensions', () => {
    const imageURL = 'https://example.com/image.jpg'
    const releaseId = '123456'
    
    const result = toDiscogsDestinationPath(imageURL, releaseId)
    
    expect(result).toBe('chrisvogt/discogs/123456_thumb.jpg')
  })

  it('should default to thumb when no imageType provided', () => {
    const imageURL = 'https://example.com/image.png'
    const releaseId = '789123'
    
    const result = toDiscogsDestinationPath(imageURL, releaseId)
    
    expect(result).toBe('chrisvogt/discogs/789123_thumb.png')
  })

  it('should handle URLs with no file extension', () => {
    const imageURL = 'https://example.com/image'
    const releaseId = '456789'
    
    const result = toDiscogsDestinationPath(imageURL, releaseId, 'cover')
    
    expect(result).toBe('chrisvogt/discogs/456789_cover')
  })
}) 