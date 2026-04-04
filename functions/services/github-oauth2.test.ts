import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildGitHubAppAuthorizeUrl,
  exchangeGitHubOAuthCode,
  fetchGitHubViewerLogin,
  refreshGitHubUserAccessToken,
} from './github-oauth2.js'

const fetchMock = vi.fn()

describe('github-oauth2', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('buildGitHubAppAuthorizeUrl includes client_id, redirect_uri, state, allow_signup', () => {
    const url = buildGitHubAppAuthorizeUrl('cid', 'https://app/cb', 'state-val')
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(u.searchParams.get('client_id')).toBe('cid')
    expect(u.searchParams.get('redirect_uri')).toBe('https://app/cb')
    expect(u.searchParams.get('state')).toBe('state-val')
    expect(u.searchParams.get('allow_signup')).toBe('true')
  })

  it('exchangeGitHubOAuthCode throws when token response is not an object', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] })
    await expect(
      exchangeGitHubOAuthCode({
        clientId: 'a',
        clientSecret: 'b',
        code: 'c',
        redirectUri: 'https://r',
      }),
    ).rejects.toThrow('not a JSON object')
  })

  it('exchangeGitHubOAuthCode throws on OAuth error field', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'bad_verification_code', error_description: 'The code is invalid' }),
    })
    await expect(
      exchangeGitHubOAuthCode({
        clientId: 'a',
        clientSecret: 'b',
        code: 'c',
        redirectUri: 'https://r',
      }),
    ).rejects.toThrow('The code is invalid')
  })

  it('exchangeGitHubOAuthCode uses error as description when error_description missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'oops' }),
    })
    await expect(
      exchangeGitHubOAuthCode({
        clientId: 'a',
        clientSecret: 'b',
        code: 'c',
        redirectUri: 'https://r',
      }),
    ).rejects.toThrow('GitHub OAuth: oops')
  })

  it('exchangeGitHubOAuthCode throws when access_token or token_type missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 't' }),
    })
    await expect(
      exchangeGitHubOAuthCode({
        clientId: 'a',
        clientSecret: 'b',
        code: 'c',
        redirectUri: 'https://r',
      }),
    ).rejects.toThrow('missing access_token')
  })

  it('exchangeGitHubOAuthCode maps optional fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'at',
        token_type: 'bearer',
        scope: 'repo',
        expires_in: 3600,
        refresh_token: 'rt',
        refresh_token_expires_in: 7200,
      }),
    })
    const out = await exchangeGitHubOAuthCode({
      clientId: 'a',
      clientSecret: 'b',
      code: 'c',
      redirectUri: 'https://r',
    })
    expect(out).toEqual({
      access_token: 'at',
      token_type: 'bearer',
      scope: 'repo',
      expires_in: 3600,
      refresh_token: 'rt',
      refresh_token_expires_in: 7200,
    })
  })

  it('refreshGitHubUserAccessToken throws when refresh response missing tokens', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'only-access' }),
    })
    await expect(
      refreshGitHubUserAccessToken({
        clientId: 'a',
        clientSecret: 'b',
        refreshToken: 'r',
      }),
    ).rejects.toThrow('missing access_token')
  })

  it('refreshGitHubUserAccessToken succeeds with minimal payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new',
        token_type: 'Bearer',
      }),
    })
    const out = await refreshGitHubUserAccessToken({
      clientId: 'a',
      clientSecret: 'b',
      refreshToken: 'oldrt',
    })
    expect(out.access_token).toBe('new')
    expect(out.token_type).toBe('Bearer')
    expect(out.scope).toBeUndefined()
  })

  it('fetchGitHubViewerLogin throws on non-OK response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    await expect(fetchGitHubViewerLogin('tok')).rejects.toThrow('GitHub user API failed (401)')
  })

  it('fetchGitHubViewerLogin throws on non-object JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => null })
    await expect(fetchGitHubViewerLogin('tok')).rejects.toThrow('invalid JSON')
  })

  it('fetchGitHubViewerLogin throws when login missing or empty', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    await expect(fetchGitHubViewerLogin('tok')).rejects.toThrow('missing login')
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ login: '' }) })
    await expect(fetchGitHubViewerLogin('tok')).rejects.toThrow('missing login')
  })

  it('fetchGitHubViewerLogin returns login on success', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ login: 'alice' }) })
    await expect(fetchGitHubViewerLogin('tok')).resolves.toBe('alice')
  })
})
