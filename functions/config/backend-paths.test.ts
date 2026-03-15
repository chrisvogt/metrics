import { describe, expect, it } from 'vitest'

import {
  getDefaultWidgetUserId,
  getUsersCollectionPath,
  getWidgetUserIdForHostname,
  toMediaPrefix,
  toUserCollectionPath,
} from './backend-paths.js'

describe('backend paths', () => {
  it('returns the default widget user id', () => {
    expect(getDefaultWidgetUserId()).toBe('chrisvogt')
  })

  it('returns the root users collection path', () => {
    expect(getUsersCollectionPath()).toBe('users')
  })

  it('builds user collection paths explicitly', () => {
    expect(toUserCollectionPath('chrisvogt', 'spotify')).toBe('users/chrisvogt/spotify')
    expect(toUserCollectionPath('chronogrove', 'instagram')).toBe('users/chronogrove/instagram')
  })

  it('builds user-scoped media prefixes explicitly', () => {
    expect(toMediaPrefix('chrisvogt', 'discogs')).toBe('chrisvogt/discogs/')
    expect(toMediaPrefix('chrisvogt', 'spotify', 'playlists/')).toBe('chrisvogt/spotify/playlists/')
  })

  it('resolves the widget user from hostname', () => {
    expect(getWidgetUserIdForHostname('api.chronogrove.com')).toBe('chronogrove')
    expect(getWidgetUserIdForHostname('api.chrisvogt.me')).toBe('chrisvogt')
    expect(getWidgetUserIdForHostname(undefined)).toBe('chrisvogt')
  })
})
