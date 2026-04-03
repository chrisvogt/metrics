import { describe, expect, it } from 'vitest'

import {
  OAUTH_RETURN_TO_MAX_LEN,
  validateReturnTo,
  withFlickrOAuthFlash,
} from './oauth-return-path.js'

describe('oauth-return-path', () => {
  it('validateReturnTo accepts safe relative paths', () => {
    expect(validateReturnTo('/')).toBe('/')
    expect(validateReturnTo('/onboarding')).toBe('/onboarding')
    expect(validateReturnTo('/?providers=open')).toBe('/?providers=open')
    expect(validateReturnTo('/onboarding?step=connections')).toBe('/onboarding?step=connections')
  })

  it('validateReturnTo rejects open redirects and junk', () => {
    expect(validateReturnTo('//evil.com')).toBeNull()
    expect(validateReturnTo('https://evil.com/foo')).toBeNull()
    expect(validateReturnTo('')).toBeNull()
    expect(validateReturnTo('/foo/../bar')).toBeNull()
    expect(validateReturnTo('/pa\nth')).toBeNull()
    expect(validateReturnTo(`/${'a'.repeat(OAUTH_RETURN_TO_MAX_LEN + 1)}`)).toBeNull()
  })

  it('withFlickrOAuthFlash merges query and sets oauth', () => {
    expect(withFlickrOAuthFlash('/onboarding', 'success')).toBe('/onboarding?oauth=flickr&status=success')
    expect(withFlickrOAuthFlash('/?providers=open', 'success')).toBe(
      '/?providers=open&oauth=flickr&status=success'
    )
    expect(withFlickrOAuthFlash('/x?foo=1', 'error', 'bad')).toBe(
      '/x?foo=1&oauth=flickr&status=error&reason=bad'
    )
  })

  it('withFlickrOAuthFlash preserves hash', () => {
    expect(withFlickrOAuthFlash('/onboarding#pane', 'success')).toBe(
      '/onboarding?oauth=flickr&status=success#pane'
    )
  })
})
