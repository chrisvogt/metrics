import { hostLabelFromHostLine } from '@/lib/request-host-headers'
import { serverFunctionsAppOrigin } from '@/lib/functions-app-origin'

/**
 * Hostname → public username slug for tenant API domains.
 * When a browser opens `https://api.customer.example/`, `src/proxy.ts` rewrites `/` to `/u/{slug}`.
 *
 * Env: comma-separated `host=slug` (same shape as Functions `WIDGET_USER_ID_BY_HOSTNAME` keys;
 * values here are **slugs** for `/u/[username]`, not necessarily Firebase uids).
 *
 * `NEXT_PUBLIC_` duplicate is optional for Edge Middleware if the non-public var is unavailable at runtime.
 * With `ENABLE_FIRESTORE_TENANT_ROUTING=true`, the proxy may resolve the slug via Cloud Functions
 * (`tenant_hosts`) after the env map misses.
 */
export function parseTenantApiRootToUsernameMap(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) {
    return {}
  }
  return raw.split(',').reduce<Record<string, string>>((acc, entry) => {
    const [k, v] = entry.split('=').map((part) => part?.trim())
    if (k && v) {
      acc[k.toLowerCase()] = v
    }
    return acc
  }, {})
}

export function tenantStatusSlugForHost(hostname: string | undefined): string | undefined {
  if (!hostname) {
    return undefined
  }
  const hostOnly = hostname.split(':')[0]?.toLowerCase() ?? ''
  const raw =
    process.env.TENANT_API_ROOT_TO_USERNAME ?? process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME
  const map = parseTenantApiRootToUsernameMap(raw)
  return map[hostOnly]
}

/**
 * Env map first, then optional Firestore-backed resolution (server-side fetch to Cloud Functions).
 */
export async function tenantStatusSlugForHostAsync(
  hostLine: string | undefined
): Promise<string | undefined> {
  const fromEnv = tenantStatusSlugForHost(hostLine)
  if (fromEnv) {
    return fromEnv
  }
  if (process.env.ENABLE_FIRESTORE_TENANT_ROUTING !== 'true') {
    return undefined
  }

  const hostOnly = hostLabelFromHostLine(hostLine ?? '')
  if (!hostOnly) {
    return undefined
  }

  const base = serverFunctionsAppOrigin()
  const url = `${base}/api/internal/resolve-tenant?${new URLSearchParams({ host: hostOnly })}`
  const headers: Record<string, string> = {}
  const k = process.env.CHRONOGROVE_INTERNAL_API_KEY?.trim()
  if (k) {
    headers['x-chronogrove-internal-key'] = k
  }

  try {
    const res = await fetch(url, { headers, cache: 'no-store' })
    if (!res.ok) {
      return undefined
    }
    const j = (await res.json()) as { username?: string | null }
    return typeof j.username === 'string' && j.username.length > 0 ? j.username : undefined
  } catch {
    return undefined
  }
}

/** True when `hostname` is listed as a tenant API root (same env as `tenantStatusSlugForHost`). Client-safe if `NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME` is set. */
export function isTenantApiRootHostname(hostname: string | undefined): boolean {
  return tenantStatusSlugForHost(hostname) !== undefined
}

/**
 * Public status surfaces that do not use Firebase Auth in the browser (`/u/*` and tenant-root `/`
 * after internal rewrite; browser URL may still show `/`).
 */
export function isAuthlessPublicStatusSurface(
  pathname: string | null | undefined,
  browserHostname: string | undefined
): boolean {
  if (pathname != null && pathname.startsWith('/u/')) {
    return true
  }
  if (pathname === '/' || pathname === '') {
    return isTenantApiRootHostname(browserHostname)
  }
  return false
}
