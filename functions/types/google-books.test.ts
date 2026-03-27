import { describe, expect, it } from 'vitest'

import { isGoogleBooksVolumesResponseSubset } from './google-books.js'

describe('isGoogleBooksVolumesResponseSubset', () => {
  it('returns false for null, non-objects, or invalid items', () => {
    expect(isGoogleBooksVolumesResponseSubset(null)).toBe(false)
    expect(isGoogleBooksVolumesResponseSubset(undefined)).toBe(false)
    expect(isGoogleBooksVolumesResponseSubset('items')).toBe(false)
    expect(isGoogleBooksVolumesResponseSubset(42)).toBe(false)
    expect(isGoogleBooksVolumesResponseSubset({ items: null })).toBe(false)
    expect(isGoogleBooksVolumesResponseSubset({ items: {} })).toBe(false)
  })

  it('returns true when items is an array', () => {
    expect(isGoogleBooksVolumesResponseSubset({ items: [] })).toBe(true)
    expect(isGoogleBooksVolumesResponseSubset({ items: [{ id: 'vol-1' }] })).toBe(true)
  })
})
