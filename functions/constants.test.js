import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('constants', () => {
  let constants
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Mock environment variables
    process.env.CLOUD_STORAGE_IMAGES_BUCKET = 'test-bucket'
    process.env.IMAGE_CDN_BASE_URL = 'https://cdn.example.com/'
    
    // Clear module cache to ensure fresh import
    delete require.cache[require.resolve('./constants')]
    constants = require('./constants')
  })

  afterEach(() => {
    process.env = originalEnv
    delete require.cache[require.resolve('./constants')]
  })

  it('should export all required constants', () => {
    expect(constants).toHaveProperty('CLOUD_STORAGE_IMAGES_BUCKET')
    expect(constants).toHaveProperty('CLOUD_STORAGE_INSTAGRAM_PATH')
    expect(constants).toHaveProperty('CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH')
    expect(constants).toHaveProperty('DATABASE_COLLECTION_FLICKR')
    expect(constants).toHaveProperty('DATABASE_COLLECTION_SPOTIFY')
    expect(constants).toHaveProperty('DATABASE_COLLECTION_STEAM')
    expect(constants).toHaveProperty('DATABASE_COLLECTION_INSTAGRAM')
    expect(constants).toHaveProperty('IMAGE_CDN_BASE_URL')
  })

  it('should have correct values for environment-dependent constants', () => {
    expect(constants.CLOUD_STORAGE_IMAGES_BUCKET).toBe('test-bucket')
    expect(constants.IMAGE_CDN_BASE_URL).toBe('https://cdn.example.com/')
  })

  it('should have correct values for hardcoded constants', () => {
    expect(constants.CLOUD_STORAGE_INSTAGRAM_PATH).toBe('ig/')
    expect(constants.CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH).toBe('spotify/playlists/')
    expect(constants.DATABASE_COLLECTION_FLICKR).toBe('flickr')
    expect(constants.DATABASE_COLLECTION_SPOTIFY).toBe('spotify')
    expect(constants.DATABASE_COLLECTION_STEAM).toBe('steam')
    expect(constants.DATABASE_COLLECTION_INSTAGRAM).toBe('instagram')
  })

  it('should handle undefined environment variables', () => {
    delete process.env.CLOUD_STORAGE_IMAGES_BUCKET
    delete process.env.IMAGE_CDN_BASE_URL
    
    delete require.cache[require.resolve('./constants')]
    const constantsWithoutEnv = require('./constants')
    
    expect(constantsWithoutEnv.CLOUD_STORAGE_IMAGES_BUCKET).toBeUndefined()
    expect(constantsWithoutEnv.IMAGE_CDN_BASE_URL).toBeUndefined()
  })
}) 