import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('toIGDestinationPath', () => {
  let toIGDestinationPath
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    
    // Mock the constants module
    vi.doMock('../constants', () => ({
      CLOUD_STORAGE_INSTAGRAM_PATH: 'ig/'
    }))
    
    // Clear module cache to ensure fresh import
    delete require.cache[require.resolve('./to-ig-destination-path')]
    toIGDestinationPath = require('./to-ig-destination-path')
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
    delete require.cache[require.resolve('./to-ig-destination-path')]
  })

  it('should generate correct destination path for JPEG image', () => {
    const mediaURL = 'https://example.com/image.jpg'
    const id = '123456789'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/123456789.jpg')
  })

  it('should generate correct destination path for PNG image', () => {
    const mediaURL = 'https://example.com/image.png'
    const id = '987654321'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/987654321.png')
  })

  it('should generate correct destination path for MP4 video', () => {
    const mediaURL = 'https://example.com/video.mp4'
    const id = '555666777'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/555666777.mp4')
  })

  it('should handle URLs with query parameters', () => {
    const mediaURL = 'https://example.com/image.jpg?width=1080&height=1080'
    const id = '111222333'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/111222333.jpg')
  })

  it('should handle URLs with hash fragments', () => {
    const mediaURL = 'https://example.com/image.png#section'
    const id = '444555666'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/444555666.png')
  })

  it('should handle URLs with complex paths', () => {
    const mediaURL = 'https://cdn.example.com/media/2023/12/25/image.jpeg'
    const id = '777888999'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/777888999.jpeg')
  })

  it('should handle URLs without file extension', () => {
    const mediaURL = 'https://example.com/image'
    const id = '000111222'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/000111222')
  })

  it('should handle URLs with multiple dots in filename', () => {
    const mediaURL = 'https://example.com/image.thumb.jpg'
    const id = '333444555'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/333444555.jpg')
  })

  it('should handle URLs with uppercase extensions', () => {
    const mediaURL = 'https://example.com/image.JPG'
    const id = '666777888'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/666777888.JPG')
  })

  it('should handle URLs with mixed case extensions', () => {
    const mediaURL = 'https://example.com/image.JpEg'
    const id = '999000111'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/999000111.JpEg')
  })

  it('should handle empty string ID', () => {
    const mediaURL = 'https://example.com/image.jpg'
    const id = ''
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/.jpg')
  })

  it('should handle numeric ID', () => {
    const mediaURL = 'https://example.com/image.jpg'
    const id = 123456789
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/123456789.jpg')
  })

  it('should handle special characters in ID', () => {
    const mediaURL = 'https://example.com/image.jpg'
    const id = 'abc-123_def'
    const result = toIGDestinationPath(mediaURL, id)
    expect(result).toBe('ig/abc-123_def.jpg')
  })
}) 