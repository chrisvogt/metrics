import { describe, expect, it } from 'vitest'

import {
  CLOUD_STORAGE_IMAGES_BUCKET,
  DATABASE_COLLECTION_USERS,
  DISCOGS_USERNAME,
  IMAGE_CDN_BASE_URL,
  LOCAL_MEDIA_ROOT,
  MEDIA_PUBLIC_BASE_URL,
  MEDIA_STORE_BACKEND,
} from './constants.js'

describe('constants', () => {
  it('exports the shared users collection path', () => {
    expect(DATABASE_COLLECTION_USERS).toBe('users')
  })

  it('exports environment-backed values without throwing', () => {
    expect(typeof CLOUD_STORAGE_IMAGES_BUCKET === 'string' || CLOUD_STORAGE_IMAGES_BUCKET === undefined).toBe(true)
    expect(typeof MEDIA_STORE_BACKEND === 'string' || MEDIA_STORE_BACKEND === undefined).toBe(true)
    expect(typeof LOCAL_MEDIA_ROOT === 'string' || LOCAL_MEDIA_ROOT === undefined).toBe(true)
    expect(typeof DISCOGS_USERNAME === 'string' || DISCOGS_USERNAME === undefined).toBe(true)
    expect(typeof IMAGE_CDN_BASE_URL === 'string' || IMAGE_CDN_BASE_URL === undefined).toBe(true)
    expect(typeof MEDIA_PUBLIC_BASE_URL === 'string' || MEDIA_PUBLIC_BASE_URL === undefined).toBe(
      true
    )
  })
})
