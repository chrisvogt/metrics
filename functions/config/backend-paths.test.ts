import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('backend paths', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.DEFAULT_WIDGET_USER_ID
    delete process.env.WIDGET_USER_ID_BY_HOSTNAME
    delete process.env.WIDGET_DATA_SOURCE_BY_PROVIDER
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns the default widget user id', async () => {
    const { getDefaultWidgetUserId } = await importBackendPaths()
    expect(getDefaultWidgetUserId()).toBe('chrisvogt')
  })

  it('returns the root users collection path', async () => {
    const { getUsersCollectionPath } = await importBackendPaths()
    expect(getUsersCollectionPath()).toBe('users')
  })

  it('builds user collection paths explicitly', async () => {
    const { toUserCollectionPath, toProviderCollectionPath } = await importBackendPaths()
    expect(toUserCollectionPath('chrisvogt', 'spotify')).toBe('users/chrisvogt/spotify')
    expect(toUserCollectionPath('chrisvogt', 'spotify', 'shadow')).toBe('users/chrisvogt/spotify_tmp')
    expect(toUserCollectionPath('chronogrove', 'instagram')).toBe('users/chronogrove/instagram')
    expect(toProviderCollectionPath('spotify')).toBe('users/chrisvogt/spotify')
    expect(toProviderCollectionPath('spotify', 'chrisvogt', 'shadow')).toBe('users/chrisvogt/spotify_tmp')
  })

  it('builds user-scoped media prefixes explicitly', async () => {
    const { toMediaPrefix, toProviderMediaPrefix } = await importBackendPaths()
    expect(toMediaPrefix('chrisvogt', 'discogs')).toBe('chrisvogt/discogs/')
    expect(toMediaPrefix('chrisvogt', 'spotify', 'playlists/')).toBe('chrisvogt/spotify/playlists/')
    expect(toMediaPrefix('chrisvogt', 'spotify', 'playlists/', 'shadow')).toBe(
      'chrisvogt/spotify_tmp/playlists/'
    )
    expect(toProviderMediaPrefix('instagram')).toBe('chrisvogt/instagram/')
  })

  it('resolves the widget user from hostname', async () => {
    const { getWidgetUserIdForHostname } = await importBackendPaths()
    expect(getWidgetUserIdForHostname('api.chronogrove.com')).toBe('chronogrove')
    expect(getWidgetUserIdForHostname('api.chrisvogt.me')).toBe('chrisvogt')
    expect(getWidgetUserIdForHostname(undefined)).toBe('chrisvogt')
  })

  it('allows the default widget user and hostname mapping to be overridden by env', async () => {
    process.env.DEFAULT_WIDGET_USER_ID = 'custom-user'
    process.env.WIDGET_USER_ID_BY_HOSTNAME =
      'api.custom.example=custom-user,api.secondary.example=secondary-user'
    process.env.WIDGET_DATA_SOURCE_BY_PROVIDER = 'steam=shadow'

    const {
      getDefaultWidgetUserId,
      getWidgetDataSourceForProvider,
      getWidgetUserIdForHostname,
      toProviderCollectionPath,
      toProviderMediaPrefix,
    } = await importBackendPaths()

    expect(getDefaultWidgetUserId()).toBe('custom-user')
    expect(getWidgetUserIdForHostname('api.custom.example')).toBe('custom-user')
    expect(getWidgetUserIdForHostname('api.secondary.example')).toBe('secondary-user')
    expect(getWidgetDataSourceForProvider('steam')).toBe('shadow')
    expect(toProviderCollectionPath('goodreads')).toBe('users/custom-user/goodreads')
    expect(toProviderMediaPrefix('discogs')).toBe('custom-user/discogs/')
  })
})

const importBackendPaths = () => {
  // Dynamic import keeps env-sensitive path config fresh per test.
  return vi.importActual<typeof import('./backend-paths.js')>('./backend-paths.js')
}
