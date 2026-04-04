/**
 * GitHub App user-to-server OAuth 2.0 (authorization code grant).
 * @see https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
 */

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

export interface GitHubTokenSuccessResponse {
  access_token: string
  token_type: string
  scope?: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
}

export interface GitHubTokenErrorResponse {
  error: string
  error_description?: string
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

async function postOAuthToken(body: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
  const json = (await res.json()) as unknown
  if (!isRecord(json)) {
    throw new Error('GitHub OAuth: token response was not a JSON object')
  }
  return json
}

function throwIfOAuthError(json: Record<string, unknown>): void {
  const err = json.error
  if (typeof err === 'string' && err.length > 0) {
    const desc = typeof json.error_description === 'string' ? json.error_description : err
    throw new Error(`GitHub OAuth: ${desc}`)
  }
}

export function buildGitHubAppAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const u = new URL('https://github.com/login/oauth/authorize')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('state', state)
  u.searchParams.set('allow_signup', 'true')
  return u.toString()
}

export async function exchangeGitHubOAuthCode(params: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<GitHubTokenSuccessResponse> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
  })
  const json = await postOAuthToken(body)
  throwIfOAuthError(json)
  const access_token = json.access_token
  const token_type = json.token_type
  if (typeof access_token !== 'string' || typeof token_type !== 'string') {
    throw new Error('GitHub OAuth: token response missing access_token')
  }
  return {
    access_token,
    token_type,
    scope: typeof json.scope === 'string' ? json.scope : undefined,
    expires_in: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    refresh_token: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
    refresh_token_expires_in:
      typeof json.refresh_token_expires_in === 'number' ? json.refresh_token_expires_in : undefined,
  }
}

export async function refreshGitHubUserAccessToken(params: {
  clientId: string
  clientSecret: string
  refreshToken: string
}): Promise<GitHubTokenSuccessResponse> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
  })
  const json = await postOAuthToken(body)
  throwIfOAuthError(json)
  const access_token = json.access_token
  const token_type = json.token_type
  if (typeof access_token !== 'string' || typeof token_type !== 'string') {
    throw new Error('GitHub OAuth: refresh response missing access_token')
  }
  return {
    access_token,
    token_type,
    scope: typeof json.scope === 'string' ? json.scope : undefined,
    expires_in: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    refresh_token: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
    refresh_token_expires_in:
      typeof json.refresh_token_expires_in === 'number' ? json.refresh_token_expires_in : undefined,
  }
}

export async function fetchGitHubViewerLogin(accessToken: string): Promise<string> {
  const res = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub user API failed (${res.status})`)
  }
  const json = (await res.json()) as unknown
  if (!isRecord(json)) {
    throw new Error('GitHub user API returned invalid JSON')
  }
  const login = json.login
  if (typeof login !== 'string' || login.length === 0) {
    throw new Error('GitHub user API response missing login')
  }
  return login
}
