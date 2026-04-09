import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

import {
  isAuthlessPublicStatusSurface,
  isTenantApiRootHostname,
  parseTenantApiRootToUsernameMap,
  tenantStatusSlugForHost,
  tenantStatusSlugForHostAsync,
} from './tenant-api-root-map'

describe('parseTenantApiRootToUsernameMap', () => {
  it('parses comma-separated host=slug pairs', () => {
    expect(parseTenantApiRootToUsernameMap('api.foo.test=alice, API.BAR.TEST=bob')).toEqual({
      'api.foo.test': 'alice',
      'api.bar.test': 'bob',
    })
  })

  it('returns empty object for blank input', () => {
    expect(parseTenantApiRootToUsernameMap(undefined)).toEqual({})
    expect(parseTenantApiRootToUsernameMap('')).toEqual({})
  })

  it('ignores entries without both host and slug', () => {
    expect(parseTenantApiRootToUsernameMap('api.foo=test,nohostonly,=novalue')).toEqual({
      'api.foo': 'test',
    })
  })
})

describe('tenantStatusSlugForHost', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('resolves host using TENANT_API_ROOT_TO_USERNAME', () => {
    process.env.TENANT_API_ROOT_TO_USERNAME = 'api.example.com=myuser'
    delete process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME
    expect(tenantStatusSlugForHost('api.example.com')).toBe('myuser')
  })

  it('strips port from host', () => {
    process.env.TENANT_API_ROOT_TO_USERNAME = 'api.example.com=myuser'
    expect(tenantStatusSlugForHost('api.example.com:443')).toBe('myuser')
  })

  it('returns undefined when host not mapped', () => {
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    delete process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME
    expect(tenantStatusSlugForHost('metrics.chrisvogt.me')).toBeUndefined()
  })

  it('returns undefined for empty hostname', () => {
    process.env.TENANT_API_ROOT_TO_USERNAME = 'api.example.com=u'
    expect(tenantStatusSlugForHost(undefined)).toBeUndefined()
    expect(tenantStatusSlugForHost('')).toBeUndefined()
  })

  it('uses NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME when non-public var is unset', () => {
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'public.api.example=pubuser'
    expect(tenantStatusSlugForHost('public.api.example')).toBe('pubuser')
  })
})

describe('isTenantApiRootHostname', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('is true only for mapped hosts', () => {
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'api.x.test=u'
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    expect(isTenantApiRootHostname('api.x.test')).toBe(true)
    expect(isTenantApiRootHostname('other.example')).toBe(false)
  })
})

describe('isAuthlessPublicStatusSurface', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('is true for /u/* paths regardless of host', () => {
    expect(isAuthlessPublicStatusSurface('/u/bob', undefined)).toBe(true)
    expect(isAuthlessPublicStatusSurface('/u/bob/extra', 'any')).toBe(true)
  })

  it('is true for / only when hostname is a tenant API root', () => {
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'api.tenant.example=slug'
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    expect(isAuthlessPublicStatusSurface('/', 'api.tenant.example')).toBe(true)
    expect(isAuthlessPublicStatusSurface('/', 'metrics.example.com')).toBe(false)
  })

  it('is false for non-public paths (e.g. signed-in app routes)', () => {
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'api.tenant.example=slug'
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    expect(isAuthlessPublicStatusSurface('/settings', 'api.tenant.example')).toBe(false)
    expect(isAuthlessPublicStatusSurface(null, 'api.tenant.example')).toBe(false)
  })
})

describe('tenantStatusSlugForHostAsync', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original }
    fetchMock.mockReset()
    process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN = 'https://fn.example.com/app'
    delete process.env.TENANT_RESOLVE_FUNCTIONS_ORIGIN
    delete process.env.TENANT_API_ROOT_TO_USERNAME
    delete process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME
    delete process.env.ENABLE_FIRESTORE_TENANT_ROUTING
    delete process.env.CHRONOGROVE_INTERNAL_API_KEY
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('returns env slug without calling fetch', async () => {
    process.env.NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME = 'api.env.async=testuser'
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    await expect(tenantStatusSlugForHostAsync('api.env.async')).resolves.toBe('testuser')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns undefined when Firestore routing is disabled', async () => {
    await expect(tenantStatusSlugForHostAsync('api.other.example')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns username from Cloud Functions JSON when enabled', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'u1', username: 'FromFs' }),
    })

    await expect(tenantStatusSlugForHostAsync('api.fs.example')).resolves.toBe('FromFs')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://fn.example.com/app/api/internal/resolve-tenant?host=api.fs.example',
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('sends internal API key header when configured', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.CHRONOGROVE_INTERNAL_API_KEY = 'secret-key'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'x' }),
    })

    await tenantStatusSlugForHostAsync('api.key.example')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'x-chronogrove-internal-key': 'secret-key' },
      })
    )
  })

  it('returns undefined when response is not ok', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })

    await expect(tenantStatusSlugForHostAsync('api.bad.example')).resolves.toBeUndefined()
  })

  it('returns undefined when fetch throws', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockRejectedValue(new Error('down'))

    await expect(tenantStatusSlugForHostAsync('api.down.example')).resolves.toBeUndefined()
  })

  it('returns undefined when username missing in JSON', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'only' }),
    })

    await expect(tenantStatusSlugForHostAsync('api.noname.example')).resolves.toBeUndefined()
  })

  it('returns undefined when host line has no host label', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    await expect(tenantStatusSlugForHostAsync('')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
