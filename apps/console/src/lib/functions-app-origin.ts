/**
 * Absolute origin of the `app` Cloud Function (no trailing slash).
 * Used for server-side fetches from the Next proxy / route handlers when `/api` rewrites are not applied.
 */
export function serverFunctionsAppOrigin(): string {
  const fromEnv =
    process.env.TENANT_RESOLVE_FUNCTIONS_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app'
  }
  return 'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app'
}
