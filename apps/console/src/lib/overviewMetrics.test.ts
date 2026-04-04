import { describe, expect, it } from 'vitest'

import { extractLastSynced, extractOverviewMetrics } from './overviewMetrics.js'

describe('extractOverviewMetrics', () => {
  it('returns [] for non-object or missing payload', () => {
    expect(extractOverviewMetrics(null)).toEqual([])
    expect(extractOverviewMetrics({})).toEqual([])
    expect(extractOverviewMetrics({ payload: null })).toEqual([])
  })

  it('uses WidgetMetricValue[] when present', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          metrics: [
            { displayName: 'Tracks', id: 't', value: 10 },
            { displayName: 'Playlists', id: 'p', value: 3 },
            { displayName: 'Extra', id: 'e', value: 1 },
          ],
        },
      }),
    ).toEqual([
      { displayName: 'Tracks', value: 10 },
      { displayName: 'Playlists', value: 3 },
    ])
  })

  it('maps Discogs-style Record metrics to rows', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: { metrics: { 'LPs Owned': 42 } },
      }),
    ).toEqual([{ displayName: 'LPs Owned', value: 42 }])
  })

  it('falls through when metrics object has no numeric or string values', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          metrics: { junk: { nested: true } },
          profile: { readCount: 7 },
        },
      }),
    ).toEqual([{ displayName: 'Books read', value: 7 }])
  })

  it('accepts string values in Record metrics', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: { metrics: { Status: 'ok' } },
      }),
    ).toEqual([{ displayName: 'Status', value: 'ok' }])
  })

  it('falls back when metrics array is empty or invalid entries only', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          metrics: [],
          profile: { readCount: 12 },
        },
      }),
    ).toEqual([{ displayName: 'Books read', value: 12 }])
  })

  it('derives Goodreads metrics when metrics field is absent', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          profile: { readCount: 500 },
          collections: { recentlyReadBooks: [{ id: '1' }, { id: '2' }] },
        },
      }),
    ).toEqual([
      { displayName: 'Books read', value: 500 },
      { displayName: 'Featured books', value: 2 },
    ])
  })

  it('uses only Featured books when readCount is missing', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          collections: { recentlyReadBooks: [1, 2, 3, 4] },
        },
      }),
    ).toEqual([{ displayName: 'Featured books', value: 4 }])
  })

  it('ignores non-finite readCount', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          profile: { readCount: Number.POSITIVE_INFINITY },
          collections: { recentlyReadBooks: [1] },
        },
      }),
    ).toEqual([{ displayName: 'Featured books', value: 1 }])
  })

  it('ignores recentlyReadBooks when not an array', () => {
    expect(
      extractOverviewMetrics({
        ok: true,
        payload: {
          profile: { readCount: 10 },
          collections: { recentlyReadBooks: { notAn: 'array' } as unknown },
        },
      }),
    ).toEqual([{ displayName: 'Books read', value: 10 }])
  })

  it('returns [] when nothing is derivable', () => {
    expect(extractOverviewMetrics({ ok: true, payload: { meta: {} } })).toEqual([])
  })
})

describe('extractLastSynced', () => {
  it('returns null when meta or synced is missing', () => {
    expect(extractLastSynced(null)).toBeNull()
    expect(extractLastSynced({ payload: {} })).toBeNull()
    expect(extractLastSynced({ payload: { meta: {} } })).toBeNull()
  })

  it('returns null when payload is not an object', () => {
    expect(extractLastSynced({ payload: 123 })).toBeNull()
  })

  it('parses ISO string synced', () => {
    const iso = '2026-03-28T12:00:00.000Z'
    expect(extractLastSynced({ payload: { meta: { synced: iso } } })).toBe(iso)
  })

  it('returns null for invalid date string', () => {
    expect(extractLastSynced({ payload: { meta: { synced: 'not-a-date' } } })).toBeNull()
  })

  it('parses Firestore Timestamp shape', () => {
    expect(
      extractLastSynced({ payload: { meta: { synced: { _seconds: 1_717_000_000, _nanoseconds: 0 } } } }),
    ).toBe(new Date(1_717_000_000 * 1000).toISOString())
  })

  it('returns null when _seconds is not finite', () => {
    expect(
      extractLastSynced({ payload: { meta: { synced: { _seconds: NaN } } } }),
    ).toBeNull()
  })

  it('returns null for synced object without Firestore timestamp shape', () => {
    expect(extractLastSynced({ payload: { meta: { synced: { foo: 1 } } } })).toBeNull()
  })
})
