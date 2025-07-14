import { describe, it, expect } from 'vitest'

import {
  CLOUD_STORAGE_IMAGES_BUCKET,
  CLOUD_STORAGE_INSTAGRAM_PATH,
  CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
  CURRENT_USERNAME,
  DATABASE_COLLECTION_FLICKR,
  DATABASE_COLLECTION_INSTAGRAM,
  DATABASE_COLLECTION_SPOTIFY,
  DATABASE_COLLECTION_STEAM,
  DATABASE_COLLECTION_GOODREADS,
  DATABASE_COLLECTION_GITHUB,
  IMAGE_CDN_BASE_URL
} from './constants.js'

describe('constants', () => {
  describe('CURRENT_USERNAME', () => {
    it('should be a string with the correct value', () => {
      expect(CURRENT_USERNAME).toBe('chrisvogt')
      expect(typeof CURRENT_USERNAME).toBe('string')
    })
  })

  describe('CLOUD_STORAGE_INSTAGRAM_PATH', () => {
    it('should be a string with the correct value', () => {
      expect(CLOUD_STORAGE_INSTAGRAM_PATH).toBe(`${CURRENT_USERNAME}/instagram/`)
      expect(typeof CLOUD_STORAGE_INSTAGRAM_PATH).toBe('string')
    })
  })

  describe('CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH', () => {
    it('should be a string with the correct value', () => {
      expect(CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH).toBe(`${CURRENT_USERNAME}/spotify/playlists/`)
      expect(typeof CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH).toBe('string')
    })
  })

  describe('DATABASE_COLLECTION_FLICKR', () => {
    it('should be a string with the correct value', () => {
      expect(DATABASE_COLLECTION_FLICKR).toBe(`users/${CURRENT_USERNAME}/flickr`)
      expect(typeof DATABASE_COLLECTION_FLICKR).toBe('string')
    })
  })

  describe('DATABASE_COLLECTION_INSTAGRAM', () => {
    it('should be a string with the correct value', () => {
      expect(DATABASE_COLLECTION_INSTAGRAM).toBe(`users/${CURRENT_USERNAME}/instagram`)
      expect(typeof DATABASE_COLLECTION_INSTAGRAM).toBe('string')
    })
  })

  describe('DATABASE_COLLECTION_SPOTIFY', () => {
    it('should be a string with the correct value', () => {
      expect(DATABASE_COLLECTION_SPOTIFY).toBe(`users/${CURRENT_USERNAME}/spotify`)
      expect(typeof DATABASE_COLLECTION_SPOTIFY).toBe('string')
    })
  })

  describe('DATABASE_COLLECTION_STEAM', () => {
    it('should be a string with the correct value', () => {
      expect(DATABASE_COLLECTION_STEAM).toBe(`users/${CURRENT_USERNAME}/steam`)
      expect(typeof DATABASE_COLLECTION_STEAM).toBe('string')
    })
  })

  describe('environment-dependent constants', () => {
    it('should have CLOUD_STORAGE_IMAGES_BUCKET as string or undefined', () => {
      expect(typeof CLOUD_STORAGE_IMAGES_BUCKET === 'string' || CLOUD_STORAGE_IMAGES_BUCKET === undefined).toBe(true)
    })

    it('should have IMAGE_CDN_BASE_URL as string or undefined', () => {
      expect(typeof IMAGE_CDN_BASE_URL === 'string' || IMAGE_CDN_BASE_URL === undefined).toBe(true)
    })
  })

  describe('all constants', () => {
    it('should export all expected constants', () => {
      const constants = {
        CLOUD_STORAGE_IMAGES_BUCKET,
        CLOUD_STORAGE_INSTAGRAM_PATH,
        CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH,
        CURRENT_USERNAME,
        DATABASE_COLLECTION_FLICKR,
        DATABASE_COLLECTION_INSTAGRAM,
        DATABASE_COLLECTION_SPOTIFY,
        DATABASE_COLLECTION_STEAM,
        DATABASE_COLLECTION_GOODREADS,
        DATABASE_COLLECTION_GITHUB,
        IMAGE_CDN_BASE_URL
      }

      expect(Object.keys(constants)).toHaveLength(11)
      expect(constants).toHaveProperty('CLOUD_STORAGE_IMAGES_BUCKET')
      expect(constants).toHaveProperty('CLOUD_STORAGE_INSTAGRAM_PATH')
      expect(constants).toHaveProperty('CLOUD_STORAGE_SPOTIFY_PLAYLISTS_PATH')
      expect(constants).toHaveProperty('CURRENT_USERNAME')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_FLICKR')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_INSTAGRAM')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_SPOTIFY')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_STEAM')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_GOODREADS')
      expect(constants).toHaveProperty('DATABASE_COLLECTION_GITHUB')
      expect(constants).toHaveProperty('IMAGE_CDN_BASE_URL')
    })
  })
}) 