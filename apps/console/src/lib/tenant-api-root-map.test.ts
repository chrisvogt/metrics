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
})
