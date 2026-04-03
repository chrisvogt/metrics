import { describe, expect, it } from 'vitest'

import {
  buildParameterString,
  buildSignatureBaseString,
  buildSigningKey,
  oauthPercentEncode,
  parseFormStyleBody,
} from './flickr-oauth1a.js'

describe('flickr-oauth1a', () => {
  it('oauthPercentEncode keeps tilde unescaped', () => {
    expect(oauthPercentEncode('a~b')).toBe('a~b')
  })

  it('buildParameterString sorts lexicographically by key then value', () => {
    const s = buildParameterString({
      z: '2',
      a: '1',
      m: '3',
    })
    expect(s).toBe('a=1&m=3&z=2')
  })

  it('buildSignatureBaseString matches Flickr doc shape (encoded segments)', () => {
    const params = {
      oauth_callback: 'http://www.example.com',
      oauth_consumer_key: '653e7a6ecc1d528c516cc8f92cf98611',
      oauth_nonce: '95613465',
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: '1305586162',
      oauth_version: '1.0',
    }
    const base = buildSignatureBaseString(
      'GET',
      'https://www.flickr.com/services/oauth/request_token',
      params
    )
    expect(base).toBe(
      [
        'GET',
        oauthPercentEncode('https://www.flickr.com/services/oauth/request_token'),
        oauthPercentEncode(buildParameterString(params)),
      ].join('&')
    )
  })

  it('buildSigningKey concatenates encoded secrets', () => {
    expect(buildSigningKey('cons&secret', 'tok/secret')).toBe(
      `${oauthPercentEncode('cons&secret')}&${oauthPercentEncode('tok/secret')}`
    )
  })

  it('parseFormStyleBody decodes Flickr access token responses', () => {
    const body =
      'fullname=Jamal%20Fanaian&oauth_token=721576263&oauth_token_secret=abc&user_nsid=21207597%40N07&username=jamal'
    expect(parseFormStyleBody(body)).toMatchObject({
      fullname: 'Jamal Fanaian',
      oauth_token: '721576263',
      oauth_token_secret: 'abc',
      user_nsid: '21207597@N07',
      username: 'jamal',
    })
  })

  it('parseFormStyleBody does not throw on malformed percent-encoding', () => {
    expect(parseFormStyleBody('a=%ZZ&oauth_token=t&oauth_token_secret=s&user_nsid=n&username=u')).toEqual({
      a: '%ZZ',
      oauth_token: 't',
      oauth_token_secret: 's',
      user_nsid: 'n',
      username: 'u',
    })
  })

  it('access-token fullname normalization does not double-decode (literal % in display name)', () => {
    const parsed = parseFormStyleBody(
      'fullname=100%25+Done&oauth_token=t&oauth_token_secret=s&user_nsid=n&username=u'
    )
    expect(parsed.fullname).toBe('100%+Done')
    const fullname = parsed.fullname ? parsed.fullname.replace(/\+/g, ' ') : ''
    expect(fullname).toBe('100% Done')
    expect(() => decodeURIComponent(fullname)).toThrow(URIError)
  })
})
