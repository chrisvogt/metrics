/** Origin for API calls: same host in dev (Vite proxy); production HTTPS absolute URL. */
export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const h = window.location.hostname
  const isDev = h === 'localhost' || h === '127.0.0.1' || h === 'metrics.dev-chrisvogt.me'
  return isDev ? '' : 'https://metrics.chrisvogt.me'
}
