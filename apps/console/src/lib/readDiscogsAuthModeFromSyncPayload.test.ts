import { describe, expect, it } from 'vitest'

import { readDiscogsAuthModeFromSyncPayload } from './readDiscogsAuthModeFromSyncPayload.js'

describe('readDiscogsAuthModeFromSyncPayload', () => {
  it('returns oauth when worker.discogsAuthMode is oauth', () => {
    expect(
      readDiscogsAuthModeFromSyncPayload({
        worker: { discogsAuthMode: 'oauth' },
      })
    ).toBe('oauth')
  })

  it('returns env when worker.discogsAuthMode is env', () => {
    expect(
      readDiscogsAuthModeFromSyncPayload({
        worker: { discogsAuthMode: 'env' },
      })
    ).toBe('env')
  })

  it('returns undefined for missing or invalid payloads', () => {
    expect(readDiscogsAuthModeFromSyncPayload(null)).toBeUndefined()
    expect(readDiscogsAuthModeFromSyncPayload(undefined)).toBeUndefined()
    expect(readDiscogsAuthModeFromSyncPayload('')).toBeUndefined()
    expect(readDiscogsAuthModeFromSyncPayload({})).toBeUndefined()
    expect(readDiscogsAuthModeFromSyncPayload({ worker: {} })).toBeUndefined()
    expect(readDiscogsAuthModeFromSyncPayload({ worker: { discogsAuthMode: 'other' } })).toBeUndefined()
  })
})
