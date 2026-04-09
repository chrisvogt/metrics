import type { DocumentStore } from '../ports/document-store.js'
import { getBackendPathConfig } from '../config/backend-config.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { toTenantHostDocPath } from '../config/future-tenant-collections.js'

export type TenantHostFirestoreClaim = { uid: string; username: string | null }

const cache = new Map<string, { value: TenantHostFirestoreClaim | null; expiresAt: number }>()
const inflight = new Map<string, Promise<TenantHostFirestoreClaim | null>>()

function cacheTtlMs(): number {
  const raw = process.env.TENANT_HOST_ROUTING_CACHE_MS
  const n = raw ? Number.parseInt(raw, 10) : 120_000
  return Number.isFinite(n) && n > 0 ? n : 120_000
}

function cacheMaxEntries(): number {
  const raw = process.env.TENANT_HOST_ROUTING_CACHE_MAX_ENTRIES
  const n = raw ? Number.parseInt(raw, 10) : 1000
  return Number.isFinite(n) && n > 0 ? n : 1000
}

/** Normalize for cache + Firestore doc id (host label only, lowercased). */
export function normalizeTenantHostnameForRouting(hostname: string | undefined): string {
  if (!hostname?.trim()) {
    return ''
  }
  const first = hostname.split(',')[0]?.trim() ?? ''
  const colon = first.indexOf(':')
  const host = colon === -1 ? first : first.slice(0, colon)
  return host.toLowerCase()
}

export function resetTenantHostRoutingCacheForTests(): void {
  cache.clear()
  inflight.clear()
}

async function loadClaimFromFirestore(
  documentStore: DocumentStore,
  normalizedHost: string
): Promise<TenantHostFirestoreClaim | null> {
  const hostPath = toTenantHostDocPath(normalizedHost)
  const claim = await documentStore.getDocument<{ uid?: unknown }>(hostPath)
  const uid =
    claim && typeof claim.uid === 'string' && claim.uid.length > 0 ? claim.uid : null
  if (!uid) {
    return null
  }

  const userPath = `${getUsersCollectionPath()}/${uid}`
  const userDoc = await documentStore.getDocument<Record<string, unknown>>(userPath)
  const un = userDoc?.username
  const username =
    typeof un === 'string' && un.length > 0 ? un.toLowerCase().trim() : null

  return { uid, username }
}

async function getCachedFirestoreClaim(
  documentStore: DocumentStore,
  normalizedHost: string
): Promise<TenantHostFirestoreClaim | null> {
  if (!normalizedHost) {
    return null
  }

  const now = Date.now()
  const hit = cache.get(normalizedHost)
  if (hit && hit.expiresAt > now) {
    return hit.value
  }

  const pending = inflight.get(normalizedHost)
  if (pending) {
    return pending
  }

  const promise = (async () => {
    try {
      const claim = await loadClaimFromFirestore(documentStore, normalizedHost)
      const ttl = cacheTtlMs()
      cache.set(normalizedHost, { value: claim, expiresAt: Date.now() + ttl })
      const max = cacheMaxEntries()
      if (cache.size > max) {
        const oldest = cache.keys().next().value
        if (oldest) {
          cache.delete(oldest)
        }
      }
      return claim
    } catch {
      return null
    } finally {
      inflight.delete(normalizedHost)
    }
  })()

  inflight.set(normalizedHost, promise)
  return promise
}

/**
 * Widget user id for the request host: env map first, then optional Firestore `tenant_hosts`
 * (when `ENABLE_FIRESTORE_TENANT_ROUTING=true`), then default user id.
 */
export async function resolveWidgetUserIdForHostname(
  documentStore: DocumentStore,
  hostname: string | undefined
): Promise<string> {
  const { defaultWidgetUserId, widgetUserIdByHostname, firestoreTenantRoutingEnabled } =
    getBackendPathConfig()
  const host = normalizeTenantHostnameForRouting(hostname)
  if (!host) {
    return defaultWidgetUserId
  }

  const envUid = widgetUserIdByHostname[host]
  if (envUid) {
    return envUid
  }

  if (!firestoreTenantRoutingEnabled) {
    return defaultWidgetUserId
  }

  const claim = await getCachedFirestoreClaim(documentStore, host)
  if (claim?.uid) {
    return claim.uid
  }

  return defaultWidgetUserId
}

/**
 * Firestore-backed claim for internal `/api/internal/resolve-tenant` (no env-map shortcut).
 * Returns null when routing is disabled or the host is not claimed.
 */
export async function resolveTenantHostForInternalApi(
  documentStore: DocumentStore,
  hostname: string | undefined
): Promise<{ uid: string | null; username: string | null }> {
  const host = normalizeTenantHostnameForRouting(hostname)
  if (!host || !getBackendPathConfig().firestoreTenantRoutingEnabled) {
    return { uid: null, username: null }
  }

  const claim = await getCachedFirestoreClaim(documentStore, host)
  if (!claim?.uid) {
    return { uid: null, username: null }
  }

  return {
    uid: claim.uid,
    username: claim.username && claim.username.length > 0 ? claim.username : null,
  }
}
