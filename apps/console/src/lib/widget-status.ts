/** Providers checked on the public tenant status page and in the signed-in Status section. */
export const WIDGET_STATUS_PROVIDERS = [
  { id: 'discogs', label: 'Discogs widget' },
  { id: 'flickr', label: 'Flickr widget' },
  { id: 'github', label: 'GitHub widget' },
  { id: 'goodreads', label: 'Goodreads widget' },
  { id: 'instagram', label: 'Instagram widget' },
  { id: 'spotify', label: 'Spotify widget' },
  { id: 'steam', label: 'Steam widget' },
] as const

export type WidgetStatusProviderId = (typeof WIDGET_STATUS_PROVIDERS)[number]['id']

export function extractLastSyncedFromWidgetResponse(json: unknown): string | null {
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
    return Number.isNaN(d.getTime()) ? synced : d.toISOString()
  }
  if (typeof synced === 'object' && synced !== null && '_seconds' in synced) {
    const sec = Number((synced as { _seconds?: unknown })._seconds)
    if (!Number.isFinite(sec)) return null
    const ns = Number((synced as { _nanoseconds?: unknown })._nanoseconds ?? 0)
    return new Date(sec * 1000 + ns / 1e6).toISOString()
  }
  return null
}
