/**
 * Hostname → public username slug for tenant API domains.
 * When a browser opens `https://api.customer.example/`, middleware rewrites to `/u/{slug}`.
 *
 * Env: comma-separated `host=slug` (same shape as Functions `WIDGET_USER_ID_BY_HOSTNAME` keys;
 * values here are **slugs** for `/u/[username]`, not necessarily Firebase uids).
 *
 * `NEXT_PUBLIC_` duplicate is optional for Edge Middleware if the non-public var is unavailable at runtime.
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
