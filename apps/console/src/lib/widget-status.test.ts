import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  WIDGET_STATUS_PROVIDERS,
  extractLastSyncedFromWidgetResponse,
  fetchWidgetStatusRow,
  formatSyncedDisplay,
} from './widget-status'

describe('extractLastSyncedFromWidgetResponse', () => {
  it('returns null for non-objects', () => {
    expect(extractLastSyncedFromWidgetResponse(null)).toBeNull()
    expect(extractLastSyncedFromWidgetResponse(undefined)).toBeNull()
    expect(extractLastSyncedFromWidgetResponse('x')).toBeNull()
    expect(extractLastSyncedFromWidgetResponse(1)).toBeNull()
  })

  it('returns null when payload or meta missing', () => {
    expect(extractLastSyncedFromWidgetResponse({})).toBeNull()
    expect(extractLastSyncedFromWidgetResponse({ payload: null })).toBeNull()
    expect(extractLastSyncedFromWidgetResponse({ payload: { x: 1 } })).toBeNull()
    expect(extractLastSyncedFromWidgetResponse({ payload: { meta: null } })).toBeNull()
  })

  it('returns null when synced is null', () => {
    expect(
      extractLastSyncedFromWidgetResponse({ payload: { meta: { synced: null } } }),
    ).toBeNull()
  })

  it('normalizes string synced to ISO when valid', () => {
    expect(
      extractLastSyncedFromWidgetResponse({
        payload: { meta: { synced: '2024-01-15T12:00:00.000Z' } },
      }),
    ).toBe('2024-01-15T12:00:00.000Z')
  })

  it('returns raw string when date parse fails', () => {
    expect(
      extractLastSyncedFromWidgetResponse({ payload: { meta: { synced: 'not-a-date' } } }),
    ).toBe('not-a-date')
  })

  it('handles Firestore timestamp shape', () => {
    expect(
      extractLastSyncedFromWidgetResponse({
        payload: { meta: { synced: { _seconds: 1700000000, _nanoseconds: 0 } } },
      }),
    ).toBe(new Date(1700000000 * 1000).toISOString())
  })

  it('includes Firestore _nanoseconds in ISO', () => {
    const iso = extractLastSyncedFromWidgetResponse({
      payload: { meta: { synced: { _seconds: 1, _nanoseconds: 500_000_000 } } },
    })
    expect(iso).toBe(new Date(1000 + 500).toISOString())
  })

  it('returns null when _seconds is not finite', () => {
    expect(
      extractLastSyncedFromWidgetResponse({
        payload: { meta: { synced: { _seconds: NaN } } },
      }),
    ).toBeNull()
    expect(
      extractLastSyncedFromWidgetResponse({
        payload: { meta: { synced: { _seconds: Number.POSITIVE_INFINITY } } },
      }),
    ).toBeNull()
  })

  it('returns null for unknown synced shape', () => {
    expect(
      extractLastSyncedFromWidgetResponse({
        payload: { meta: { synced: { notSeconds: 1 } } },
      }),
    ).toBeNull()
  })
})

describe('formatSyncedDisplay', () => {
  it('returns em dash for null', () => {
    expect(formatSyncedDisplay(null)).toBe('—')
  })

  it('returns em dash for epoch zero', () => {
    expect(formatSyncedDisplay(new Date(0).toISOString())).toBe('—')
  })

  it('returns raw when parse fails', () => {
    expect(formatSyncedDisplay('bogus')).toBe('bogus')
  })

  it('formats valid ISO', () => {
    const s = formatSyncedDisplay('2024-06-01T15:30:00.000Z')
    expect(s).not.toBe('—')
    expect(s.length).toBeGreaterThan(4)
  })
})

describe('fetchWidgetStatusRow', () => {
  const origin = 'http://127.0.0.1:5001/app'

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ payload: { meta: { synced: '2024-01-01T00:00:00.000Z' } } }),
        } as Response),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns row with lastSynced on OK JSON', async () => {
    const row = await fetchWidgetStatusRow(origin, 'alice', 'spotify', 'Spotify')
    expect(row.ok).toBe(true)
    expect(row.httpStatus).toBe(200)
    expect(row.path).toBe('/api/widgets/spotify?username=alice')
    expect(row.lastSynced).toBe('2024-01-01T00:00:00.000Z')
    expect(row.error).toBeNull()
  })

  it('parses JSON body when ok even if content-type is not application/json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/plain' }),
          json: () => Promise.resolve({ payload: { meta: { synced: '2024-02-01T00:00:00.000Z' } } }),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'github', 'GitHub')
    expect(row.ok).toBe(true)
    expect(row.lastSynced).toBe('2024-02-01T00:00:00.000Z')
  })

  it('omits username query when resolveUserLikePublicWidgets is true', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ payload: { meta: {} } }),
      } as Response),
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchWidgetStatusRow(origin, 'alice', 'discogs', 'Discogs', {
      tenantPublicHost: 'api.example.com',
      resolveUserLikePublicWidgets: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/api/widgets/discogs`,
      expect.anything(),
    )
  })

  it('includes debugDetail on non-OK when debug is true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify({ ok: false, error: 'No Spotify data' })),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe('No Spotify data')
  })

  it('debug non-OK uses body slice when JSON parses but has no error field', async () => {
    const body = JSON.stringify({ ok: false, message: 'nope' })
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 422,
          headers: new Headers(),
          text: () => Promise.resolve(body),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe(body)
  })

  it('debug non-OK uses body slice when JSON.parse fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          headers: new Headers(),
          text: () => Promise.resolve('not-json{'),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe('not-json{')
  })

  it('debug non-OK falls back to HTTP status when body is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 418,
          headers: new Headers(),
          text: () => Promise.resolve(''),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe('(HTTP 418)')
  })

  it('debug non-OK when text() rejects still yields debugDetail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: () => Promise.reject(new Error('read fail')),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe('(HTTP 503)')
  })

  it('includes debugDetail on fetch rejection when debug is true', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('boom'))))
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', { debug: true })
    expect(row.debugDetail).toBe('boom')
  })

  it('keeps username query when resolveUserLikePublicWidgets without tenantPublicHost', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ payload: { meta: {} } }),
      } as Response),
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchWidgetStatusRow(origin, 'alice', 'discogs', 'Discogs', {
      resolveUserLikePublicWidgets: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/api/widgets/discogs?username=alice`,
      expect.anything(),
    )
  })

  it('sends x-chronogrove-public-host when tenantPublicHost is set', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ payload: { meta: {} } }),
      } as Response),
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', {
      tenantPublicHost: 'api.example.com:443',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/widgets/spotify?username=u'),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    const hdrs = fetchMock.mock.calls[0][1].headers as Headers
    expect(hdrs.get('x-chronogrove-public-host')).toBe('api.example.com')
  })

  it('sends first host label when tenantPublicHost lists multiple comma-separated hosts', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ payload: { meta: {} } }),
      } as Response),
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify', {
      tenantPublicHost: 'api.example.com, proxy.internal',
    })
    const hdrs = fetchMock.mock.calls[0][1].headers as Headers
    expect(hdrs.get('x-chronogrove-public-host')).toBe('api.example.com')
  })

  it('handles json parse failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.reject(new Error('bad json')),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'steam', 'Steam')
    expect(row.ok).toBe(true)
    expect(row.lastSynced).toBeNull()
  })

  it('records non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({}),
        } as Response),
      ),
    )
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify')
    expect(row.ok).toBe(false)
    expect(row.httpStatus).toBe(404)
  })

  it('captures network errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))))
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify')
    expect(row.ok).toBe(false)
    expect(row.httpStatus).toBe(0)
    expect(row.error).toBe('network down')
  })

  it('stringifies non-Error rejections', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject('weird')))
    const row = await fetchWidgetStatusRow(origin, 'u', 'spotify', 'Spotify')
    expect(row.error).toBe('weird')
  })
})

describe('WIDGET_STATUS_PROVIDERS', () => {
  it('lists seven providers', () => {
    expect(WIDGET_STATUS_PROVIDERS.length).toBe(7)
  })
})
