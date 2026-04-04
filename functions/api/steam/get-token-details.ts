import got from 'got'

const ENDPOINT = 'https://api.steampowered.com/ISteamUserOAuth/GetTokenDetails/v1/'

function extractSteamId(body: unknown): string | null {
  if (body == null || typeof body !== 'object') return null
  const r = (body as { response?: unknown }).response
  if (r == null || typeof r !== 'object') return null
  const resp = r as Record<string, unknown>
  const direct = resp.steamid ?? resp.steamId
  if (typeof direct === 'string' && /^\d+$/.test(direct)) return direct
  const params = resp.params
  if (params != null && typeof params === 'object') {
    const p = (params as Record<string, unknown>).steamid
    if (typeof p === 'string' && /^\d+$/.test(p)) return p
  }
  return null
}

/**
 * Resolves a Steam OAuth access token to a 64-bit SteamID string.
 * @see https://partner.steamgames.com/doc/webapi_overview/oauth
 */
export async function getSteamIdFromAccessToken(accessToken: string): Promise<string> {
  const { body } = await got(ENDPOINT, {
    responseType: 'json',
    searchParams: { access_token: accessToken },
  })
  const steamId = extractSteamId(body)
  if (!steamId) {
    throw new Error('Could not resolve SteamID from OAuth token')
  }
  return steamId
}
