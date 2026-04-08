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
  /** Populated when `debug: true` and the response failed or fetch threw. */
  debugDetail?: string
}

export type FetchWidgetStatusRowOptions = {
  /**
   * Browser-visible hostname (e.g. `api.customer.example`). Sent as `x-chronogrove-public-host` so
   * Functions can treat the request like a same-origin hit to that host (hostname map, etc.).
   */
  tenantPublicHost?: string
  /**
   * When true, omit `?username=` so Functions resolves the widget user like **`/widgets/:provider`**
   * (hostname map only). Use only when this host’s tenant slug matches `username` (see
   * `tenantStatusSlugForHost`); otherwise keep the query param for correct `/u/{other}` behavior.
   */
  resolveUserLikePublicWidgets?: boolean
  /** If true, non-OK bodies (and fetch errors) are summarized in `debugDetail` for troubleshooting. */
  debug?: boolean
}

/** One provider row for the public tenant status page (server-side `fetch`). */
export async function fetchWidgetStatusRow(
  origin: string,
  username: string,
  providerId: string,
  label: string,
  options?: FetchWidgetStatusRowOptions
): Promise<WidgetStatusRowResult> {
  const useHostnameLikeWidgets =
    options?.resolveUserLikePublicWidgets === true && options?.tenantPublicHost
  const path = useHostnameLikeWidgets
    ? `/api/widgets/${providerId}`
    : `/api/widgets/${providerId}?username=${encodeURIComponent(username)}`
  const started = Date.now()
  try {
    const headers = new Headers({ Accept: 'application/json' })
    const hostOnly = options?.tenantPublicHost?.split(',')[0]?.trim().split(':')[0]?.toLowerCase()
    if (hostOnly) {
      headers.set('x-chronogrove-public-host', hostOnly)
    }
    const res = await fetch(`${origin}${path}`, { cache: 'no-store', headers })
    const ms = Date.now() - started
    let lastSynced: string | null = null
    let debugDetail: string | undefined
    if (res.ok) {
      // Do not gate on Content-Type: CDNs / compression sometimes omit or vary the header while
      // the body is still JSON.
      const data = await res.json().catch(() => null)
      lastSynced = extractLastSyncedFromWidgetResponse(data)
    } else if (options?.debug) {
      const text = await res.text().catch(() => '')
      try {
        const j = JSON.parse(text) as { error?: string; ok?: boolean }
        debugDetail = j?.error ?? text.slice(0, 500)
      } catch {
        debugDetail = text.slice(0, 500) || `(HTTP ${res.status})`
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
      ...(debugDetail !== undefined ? { debugDetail } : {}),
    }
  } catch (err) {
    const ms = Date.now() - started
    const msg = err instanceof Error ? err.message : String(err)
    return {
      label,
      path,
      httpStatus: 0,
      ok: false,
      ms,
      lastSynced: null,
      error: msg,
      ...(options?.debug ? { debugDetail: msg } : {}),
    }
  }
}
