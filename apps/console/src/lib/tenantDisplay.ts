/**
 * Hostname of the tenant’s public site, shown on the overview hero and headers.
 *
 * Set at build time: `NEXT_PUBLIC_TENANT_DISPLAY_HOST` — e.g. `www.example.com`
 * or `https://www.example.com` (scheme is stripped).
 *
 * This repo defaults the value in `next.config.mjs` so the console host (e.g.
 * metrics…) is not mistaken for the site visitors care about. Other tenants
 * override via env in CI or `.env.local`.
 */
export function normalizeTenantDisplayHost(raw: string): string {
  let s = raw.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).hostname
    } catch {
      const rest = s.replace(/^https?:\/\//i, '')
      return rest.split('/')[0] ?? rest
    }
  }
  return s
}

/** Resolves after Next inlines `NEXT_PUBLIC_TENANT_DISPLAY_HOST` at build time. */
export function getTenantDisplayHost(): string {
  const raw = process.env.NEXT_PUBLIC_TENANT_DISPLAY_HOST ?? ''
  return normalizeTenantDisplayHost(raw)
}
