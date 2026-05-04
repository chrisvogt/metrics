/** True for local Next dev and Firebase dev hostnames (relative `/api` URLs). */
export function isDevApiHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'console.dev-chronogrove.com'
}

/** Base URL for `/api` fetches: empty so requests stay same-origin; Next rewrites to the Cloud Function. */
export function getAppBaseUrl(): string {
  return ''
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

/** Full URL for manual sync SSE (`GET …/stream`): relative in dev, Cloud Functions origin in production. */
export function getManualSyncStreamUrl(provider: string): string {
  const base = getSyncStreamBaseUrl()
  return `${base}/api/widgets/sync/${provider}/stream`
}
