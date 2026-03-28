/**
 * Parses widget API JSON (`{ ok: true, payload: … }`) for the overview dashboard.
 * Backend shapes differ: Spotify/Steam use `metrics: WidgetMetricValue[]`; Discogs uses
 * `metrics: Record<string, number>`; Goodreads omits `metrics` and exposes counts via
 * `profile.readCount` and `collections.recentlyReadBooks`.
 */

export interface MetricItem {
  displayName: string
  value: number | string
}

const MAX_METRICS = 2

function metricsFromArray(raw: unknown[]): MetricItem[] {
  return raw
    .filter(
      (m): m is { displayName: string; value: number | string } =>
        m != null &&
        typeof m === 'object' &&
        'displayName' in m &&
        'value' in m &&
        typeof (m as Record<string, unknown>).displayName === 'string'
    )
    .slice(0, MAX_METRICS)
    .map((m) => ({ displayName: m.displayName, value: m.value }))
}

function metricsFromRecord(raw: Record<string, unknown>): MetricItem[] {
  const entries = Object.entries(raw)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .slice(0, MAX_METRICS)
    .map(([displayName, value]) => ({ displayName, value: value as number | string }))
  return entries
}

function metricsFromGoodreadsFallback(payload: Record<string, unknown>): MetricItem[] {
  const out: MetricItem[] = []
  const profile = payload.profile
  if (profile && typeof profile === 'object' && profile !== null) {
    const rc = (profile as Record<string, unknown>).readCount
    if (typeof rc === 'number' && Number.isFinite(rc)) {
      out.push({ displayName: 'Books read', value: rc })
    }
  }
  const collections = payload.collections
  if (collections && typeof collections === 'object' && collections !== null) {
    const books = (collections as Record<string, unknown>).recentlyReadBooks
    if (Array.isArray(books)) {
      out.push({ displayName: 'Featured books', value: books.length })
    }
  }
  return out.slice(0, MAX_METRICS)
}

export function extractOverviewMetrics(json: unknown): MetricItem[] {
  if (!json || typeof json !== 'object') return []
  const root = json as Record<string, unknown>
  const payload = root.payload
  if (!payload || typeof payload !== 'object') return []

  const p = payload as Record<string, unknown>
  const rawMetrics = p.metrics

  if (Array.isArray(rawMetrics)) {
    const fromArr = metricsFromArray(rawMetrics as unknown[])
    if (fromArr.length > 0) return fromArr
  }

  if (rawMetrics && typeof rawMetrics === 'object' && !Array.isArray(rawMetrics)) {
    const fromRec = metricsFromRecord(rawMetrics as Record<string, unknown>)
    if (fromRec.length > 0) return fromRec
  }

  const fallback = metricsFromGoodreadsFallback(p)
  return fallback
}

export function extractLastSynced(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null
  const root = json as Record<string, unknown>
  const payload = root.payload
  if (!payload || typeof payload !== 'object') return null
  const meta = (payload as Record<string, unknown>).meta
  if (!meta || typeof meta !== 'object') return null
  const synced = (meta as Record<string, unknown>).synced
  if (synced == null) return null
  if (typeof synced === 'string') {
    const d = new Date(synced)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof synced === 'object' && synced !== null && '_seconds' in synced) {
    const sec = Number((synced as { _seconds?: unknown })._seconds)
    if (!Number.isFinite(sec)) return null
    return new Date(sec * 1000).toISOString()
  }
  return null
}
