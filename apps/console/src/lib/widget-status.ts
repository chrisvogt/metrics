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

/** Table cell display for `meta.synced` ISO strings (public status page + console status). */
export function formatSyncedDisplay(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  if (d.getTime() === 0) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export type WidgetStatusRowResult = {
  label: string
  path: string
  httpStatus: number
  ok: boolean
  ms: number
  lastSynced: string | null
  error: string | null
}

/** One provider row for the public tenant status page (server-side `fetch`). */
export async function fetchWidgetStatusRow(
  origin: string,
  username: string,
  providerId: string,
  label: string
): Promise<WidgetStatusRowResult> {
  const path = `/api/widgets/${providerId}?username=${encodeURIComponent(username)}`
  const started = Date.now()
  try {
    const res = await fetch(`${origin}${path}`, { cache: 'no-store' })
    const ms = Date.now() - started
    let lastSynced: string | null = null
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => null)
        lastSynced = extractLastSyncedFromWidgetResponse(data)
      }
    }
    return {
      label,
      path,
      httpStatus: res.status,
      ok: res.ok,
      ms,
      lastSynced,
      error: null,
    }
  } catch (err) {
    const ms = Date.now() - started
    return {
      label,
      path,
      httpStatus: 0,
      ok: false,
      ms,
      lastSynced: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
