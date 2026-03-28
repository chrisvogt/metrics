function isDevApiHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'metrics.dev-chrisvogt.me'
}

/** Origin for API calls: same host in dev (Next rewrites /api to emulators); production HTTPS absolute URL. */
export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const h = window.location.hostname
  return isDevApiHost(h) ? '' : 'https://metrics.chrisvogt.me'
}

/**
 * Base URL for manual sync SSE (`GET /api/widgets/sync/:provider/stream`).
 * In production, use the Cloud Functions HTTPS origin so Firebase Hosting does not buffer the stream.
 * In dev, use a relative URL (Next dev rewrite / Hosting emulator → Functions).
 */
export function getSyncStreamBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  if (isDevApiHost(window.location.hostname)) return ''
  return process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN ?? ''
}
