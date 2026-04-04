import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DISCOGS_AUTHORIZE_URL,
  buildDiscogsAuthorizeUrl,
  discogsGetAccessToken,
  discogsGetIdentity,
  discogsGetRequestToken,
  discogsOAuthGotGet,
} from './discogs-oauth1a.js'

const gotHttp = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('got', () => ({ default: gotHttp }))

describe('discogs-oauth1a', () => {
  beforeEach(() => {
    gotHttp.get.mockReset()
    gotHttp.post.mockReset()
  })

  it('discogsGetRequestToken parses 200 form body', async () => {
    gotHttp.get.mockResolvedValue({
      body: 'oauth_token=t&oauth_token_secret=s&oauth_callback_confirmed=true',
    } as never)
    const out = await discogsGetRequestToken({
      consumerKey: 'ck',
      consumerSecret: 'cs',
      oauthCallback: 'https://cb',
    })
    expect(out).toEqual({ oauthToken: 't', oauthTokenSecret: 's' })
    expect(gotHttp.get).toHaveBeenCalledTimes(1)
  })

  it('discogsGetRequestToken throws when callback not confirmed', async () => {
    gotHttp.get.mockResolvedValue({
      body: 'oauth_token=t&oauth_token_secret=s&oauth_callback_confirmed=false',
    } as never)
    await expect(
      discogsGetRequestToken({ consumerKey: 'ck', consumerSecret: 'cs', oauthCallback: 'https://cb' })
    ).rejects.toThrow(/not confirmed/)
  })

  it('discogsGetRequestToken throws when tokens missing', async () => {
    gotHttp.get.mockResolvedValue({
      body: 'oauth_callback_confirmed=true',
    } as never)
    await expect(
      discogsGetRequestToken({ consumerKey: 'ck', consumerSecret: 'cs', oauthCallback: 'https://cb' })
    ).rejects.toThrow(/request_token failed/)
  })

  it('discogsGetAccessToken parses form body', async () => {
    gotHttp.post.mockResolvedValue({
      body: 'oauth_token=at&oauth_token_secret=ats',
    } as never)
    const out = await discogsGetAccessToken({
      consumerKey: 'ck',
      consumerSecret: 'cs',
      oauthToken: 'rt',
      oauthTokenSecret: 'rts',
      oauthVerifier: 'v',
    })
    expect(out).toEqual({ oauthToken: 'at', oauthTokenSecret: 'ats' })
  })

  it('discogsGetAccessToken throws when tokens missing', async () => {
    gotHttp.post.mockResolvedValue({ body: 'error=1' } as never)
    await expect(
      discogsGetAccessToken({
        consumerKey: 'ck',
        consumerSecret: 'cs',
        oauthToken: 'rt',
        oauthTokenSecret: 'rts',
        oauthVerifier: 'v',
      })
    ).rejects.toThrow(/access_token failed/)
  })

  it('buildDiscogsAuthorizeUrl sets oauth_token query', () => {
    const url = buildDiscogsAuthorizeUrl('reqtok')
    expect(url.startsWith(DISCOGS_AUTHORIZE_URL)).toBe(true)
    expect(url).toContain('oauth_token=reqtok')
  })

  it('discogsOAuthGotGet performs signed GET', async () => {
    gotHttp.get.mockResolvedValue({ body: '{"ok":1}' } as never)
    const auth = {
      consumerKey: 'ck',
      consumerSecret: 'cs',
      oauthToken: 'ot',
      oauthTokenSecret: 'ots',
    }
    const { body } = await discogsOAuthGotGet('https://api.discogs.com/foo?bar=baz', auth)
    expect(body).toBe('{"ok":1}')
    const call = gotHttp.get.mock.calls[0]
    expect(call?.[0]).toBe('https://api.discogs.com/foo?bar=baz')
    const headers = (call?.[1] as { headers?: Record<string, string> })?.headers
    expect(headers?.Authorization).toMatch(/^OAuth /)
  })

  it('discogsGetIdentity returns username from JSON', async () => {
    gotHttp.get.mockResolvedValue({ body: '{"username":"pat"}' } as never)
    await expect(
      discogsGetIdentity({
        consumerKey: 'ck',
        consumerSecret: 'cs',
        oauthToken: 'ot',
        oauthTokenSecret: 'ots',
      })
    ).resolves.toEqual({ username: 'pat' })
  })

  it('discogsGetIdentity throws when username missing', async () => {
    gotHttp.get.mockResolvedValue({ body: '{}' } as never)
    await expect(
      discogsGetIdentity({
        consumerKey: 'ck',
        consumerSecret: 'cs',
        oauthToken: 'ot',
        oauthTokenSecret: 'ots',
      })
    ).rejects.toThrow(/missing username/)
  })
})
