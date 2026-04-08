/**
 * Normalize `Host` / `X-Forwarded-Host` the same way across proxy, SSR pages, and widget probes.
 * Proxies may append comma-separated hosts; the first value is the original client-facing host.
 */
export type HeaderBag = { get(name: string): string | null }

export function primaryHostLineFromHeaders(headers: HeaderBag): string | undefined {
  const xf = headers.get('x-forwarded-host')
  const host = headers.get('host')
  const line = xf?.split(',')[0]?.trim() || host?.split(',')[0]?.trim()
  return line || undefined
}

/** Lowercase hostname without port — maps, `x-chronogrove-public-host`, and `hostLooksLocal` checks. */
export function hostLabelFromHostLine(line: string | undefined | null): string | undefined {
  if (line == null || line === '') return undefined
  const segment = line.split(',')[0]?.trim()
  if (!segment) return undefined
  const label = segment.split(':')[0]?.toLowerCase()
  return label || undefined
}
