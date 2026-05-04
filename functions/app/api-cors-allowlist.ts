/**
 * Regex list for `cors({ origin })` on `/api` (credentialed fetches, sync SSE, etc.).
 *
 * The first pattern allows `*.chrisvogt.me` except the legacy **`metrics`** label on that
 * zone (sunset operator host). Keep that host denied even if DNS were pointed back.
 */
export function getApiCorsOriginRegexList(isProduction: boolean): RegExp[] {
  const corsAllowList: RegExp[] = [
    /^https?:\/\/(?!metrics\.)([a-z0-9-]+\.)*chrisvogt\.me$/,
    /https?:\/\/([a-z0-9]+[.])*dev-chrisvogt[.]me:?(.*)$/,
    /^https?:\/\/([a-z0-9-]+--)?chrisvogt\.netlify\.app$/,
    /https?:\/\/([a-z0-9]+[.])*chronogrove[.]com$/,
    /https?:\/\/([a-z0-9]+[.])*dev-chronogrove[.]com$/,
  ]

  if (!isProduction) {
    corsAllowList.push(/localhost:?(\d+)?$/)
  }

  return corsAllowList
}
