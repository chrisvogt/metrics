import { describe, expect, it } from 'vitest'

import { readFlickrAuthModeFromSyncPayload } from './readFlickrAuthModeFromSyncPayload.js'

describe('readFlickrAuthModeFromSyncPayload', () => {
  it('returns oauth when worker.flickrAuthMode is oauth', () => {
    expect(
      readFlickrAuthModeFromSyncPayload({
        worker: { flickrAuthMode: 'oauth' },
      })
    ).toBe('oauth')
  })

  it('returns env when worker.flickrAuthMode is env', () => {
    expect(
      readFlickrAuthModeFromSyncPayload({
        worker: { flickrAuthMode: 'env' },
      })
    ).toBe('env')
  })

  it('returns undefined for invalid or missing modes', () => {
    expect(readFlickrAuthModeFromSyncPayload(null)).toBeUndefined()
    expect(readFlickrAuthModeFromSyncPayload(undefined)).toBeUndefined()
    expect(readFlickrAuthModeFromSyncPayload('')).toBeUndefined()
    expect(readFlickrAuthModeFromSyncPayload({})).toBeUndefined()
    expect(readFlickrAuthModeFromSyncPayload({ worker: {} })).toBeUndefined()
    expect(
      readFlickrAuthModeFromSyncPayload({ worker: { flickrAuthMode: 'other' } })
    ).toBeUndefined()
  })
})
