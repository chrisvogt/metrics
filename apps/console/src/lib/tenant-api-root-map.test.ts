import { describe, expect, it, vi, afterEach } from 'vitest'
import { parseTenantApiRootToUsernameMap, tenantStatusSlugForHost } from './tenant-api-root-map'

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
