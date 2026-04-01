import { describe, expect, it } from 'vitest'

import {
  TENANT_HOSTS_COLLECTION,
  TENANT_USERNAMES_COLLECTION,
  USER_INTEGRATIONS_SEGMENT,
  toTenantHostDocPath,
  toTenantUsernameDocPath,
  toUserIntegrationDocPath,
} from './future-tenant-collections.js'

describe('future-tenant-collections', () => {
  it('builds tenant username document paths', () => {
    expect(toTenantUsernameDocPath('my_slug')).toBe(`${TENANT_USERNAMES_COLLECTION}/my_slug`)
  })

  it('builds tenant host document paths', () => {
    expect(toTenantHostDocPath('api.example.com')).toBe(
      `${TENANT_HOSTS_COLLECTION}/api.example.com`
    )
  })

  it('builds user integration document paths', () => {
    expect(toUserIntegrationDocPath('uid-1', 'github')).toBe(
      `users/uid-1/${USER_INTEGRATIONS_SEGMENT}/github`
    )
  })
})
