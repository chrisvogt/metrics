import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  normalizeTenantHostnameForRouting,
  resetTenantHostRoutingCacheForTests,
  resolveTenantHostForInternalApi,
  resolveWidgetUserIdForHostname,
} from './tenant-host-routing.js'

describe('tenant-host-routing', () => {
  const originalEnv = { ...process.env }

  const documentStore = {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
    legacyUsernameOwnerUid: vi.fn(),
  }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.ENABLE_FIRESTORE_TENANT_ROUTING
    delete process.env.WIDGET_USER_ID_BY_HOSTNAME
    delete process.env.TENANT_HOST_ROUTING_CACHE_MS
    delete process.env.TENANT_HOST_ROUTING_CACHE_MAX_ENTRIES
    vi.mocked(documentStore.getDocument).mockReset()
    resetTenantHostRoutingCacheForTests()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('normalizeTenantHostnameForRouting lowercases and strips port', () => {
    expect(normalizeTenantHostnameForRouting('API.Example.COM:8080')).toBe('api.example.com')
    expect(normalizeTenantHostnameForRouting('  foo.bar  ')).toBe('foo.bar')
    expect(normalizeTenantHostnameForRouting('   ')).toBe('')
    expect(normalizeTenantHostnameForRouting('CLIENT, proxy.internal')).toBe('client')
  })

  it('uses default cache max when TENANT_HOST_ROUTING_CACHE_MAX_ENTRIES is invalid', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.TENANT_HOST_ROUTING_CACHE_MAX_ENTRIES = 'not-a-number'
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    await resolveWidgetUserIdForHostname(documentStore, 'h-invalid-max.example')
    expect(documentStore.getDocument).toHaveBeenCalled()
  })

  it('uses default cache TTL when TENANT_HOST_ROUTING_CACHE_MS is invalid', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.TENANT_HOST_ROUTING_CACHE_MS = '0'
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    await resolveWidgetUserIdForHostname(documentStore, 'h-invalid-ttl.example')
    expect(documentStore.getDocument).toHaveBeenCalled()
  })

  it('uses default cache TTL when TENANT_HOST_ROUTING_CACHE_MS is negative', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.TENANT_HOST_ROUTING_CACHE_MS = '-1'
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    await resolveWidgetUserIdForHostname(documentStore, 'h-negative-ttl.example')
    expect(documentStore.getDocument).toHaveBeenCalled()
  })

  it('resolveWidgetUserIdForHostname returns default when hostname normalizes empty', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.DEFAULT_WIDGET_USER_ID = 'default-only'
    const uid = await resolveWidgetUserIdForHostname(documentStore, '   \t\n')
    expect(uid).toBe('default-only')
    expect(documentStore.getDocument).not.toHaveBeenCalled()
  })

  it('resolveWidgetUserIdForHostname returns default when hostname is undefined', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.DEFAULT_WIDGET_USER_ID = 'def-undef'
    const uid = await resolveWidgetUserIdForHostname(documentStore, undefined)
    expect(uid).toBe('def-undef')
    expect(documentStore.getDocument).not.toHaveBeenCalled()
  })

  it('resolveWidgetUserIdForHostname uses env map before Firestore', async () => {
    process.env.WIDGET_USER_ID_BY_HOSTNAME = JSON.stringify({
      'api.env-only.example': 'env-user',
    })
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'

    const uid = await resolveWidgetUserIdForHostname(documentStore, 'api.env-only.example')
    expect(uid).toBe('env-user')
    expect(documentStore.getDocument).not.toHaveBeenCalled()
  })

  it('resolveWidgetUserIdForHostname reads tenant_hosts when flag on and env misses', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({ uid: 'fs-uid' })
      .mockResolvedValueOnce({ username: 'alice' })

    const uid = await resolveWidgetUserIdForHostname(documentStore, 'api.firestore.example')
    expect(uid).toBe('fs-uid')
    expect(documentStore.getDocument).toHaveBeenCalled()
  })

  it('resolveWidgetUserIdForHostname caches Firestore hits', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({ uid: 'cached-uid' })
      .mockResolvedValueOnce({ username: 'bob' })

    await resolveWidgetUserIdForHostname(documentStore, 'api.cache.example')
    await resolveWidgetUserIdForHostname(documentStore, 'api.cache.example')

    expect(documentStore.getDocument).toHaveBeenCalledTimes(2)
  })

  it('resolveTenantHostForInternalApi returns null when routing disabled', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({ uid: 'x' })
    const r = await resolveTenantHostForInternalApi(documentStore, 'api.any.example')
    expect(r).toEqual({ uid: null, username: null })
    expect(documentStore.getDocument).not.toHaveBeenCalled()
  })

  it('resolveTenantHostForInternalApi returns uid and username from Firestore', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({ uid: 'u1' })
      .mockResolvedValueOnce({ username: 'Carol' })

    const r = await resolveTenantHostForInternalApi(documentStore, 'api.claim.example')
    expect(r).toEqual({ uid: 'u1', username: 'carol' })
  })

  it('resolveTenantHostForInternalApi returns null username when user doc has no slug', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument)
      .mockResolvedValueOnce({ uid: 'u2' })
      .mockResolvedValueOnce({})

    const r = await resolveTenantHostForInternalApi(documentStore, 'api.noslug.example')
    expect(r).toEqual({ uid: 'u2', username: null })
  })

  it('resolveTenantHostForInternalApi returns nulls when tenant host doc is missing', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    const r = await resolveTenantHostForInternalApi(documentStore, 'api.no-tenant-doc.example')
    expect(r).toEqual({ uid: null, username: null })
  })

  it('resolveTenantHostForInternalApi returns nulls when tenant uid is not a string', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument).mockResolvedValueOnce({ uid: 123 })
    const r = await resolveTenantHostForInternalApi(documentStore, 'api.bad-uid-type.example')
    expect(r).toEqual({ uid: null, username: null })
    expect(documentStore.getDocument).toHaveBeenCalledTimes(1)
  })

  it('resolveTenantHostForInternalApi returns nulls when tenant uid is empty string', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument).mockResolvedValueOnce({ uid: '' })
    const r = await resolveTenantHostForInternalApi(documentStore, 'api.empty-uid.example')
    expect(r).toEqual({ uid: null, username: null })
  })

  it('resolveWidgetUserIdForHostname uses default when Firestore read throws', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.DEFAULT_WIDGET_USER_ID = 'fallback-user'
    vi.mocked(documentStore.getDocument).mockRejectedValue(new Error('firestore'))

    const uid = await resolveWidgetUserIdForHostname(documentStore, 'api.boom.example')
    expect(uid).toBe('fallback-user')
  })

  it('deduplicates concurrent Firestore lookups for the same host', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    vi.mocked(documentStore.getDocument).mockImplementation(async (path: string) => {
      if (path.startsWith('tenant_hosts/')) {
        return { uid: 'same' }
      }
      return { username: 'twin' }
    })

    await Promise.all([
      resolveWidgetUserIdForHostname(documentStore, 'api.dedup.example'),
      resolveWidgetUserIdForHostname(documentStore, 'api.dedup.example'),
    ])

    expect(documentStore.getDocument).toHaveBeenCalledTimes(2)
  })

  it('evicts oldest cache entry when max size exceeded', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.TENANT_HOST_ROUTING_CACHE_MAX_ENTRIES = '2'
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)

    await resolveWidgetUserIdForHostname(documentStore, 'h1.example')
    await resolveWidgetUserIdForHostname(documentStore, 'h2.example')
    await resolveWidgetUserIdForHostname(documentStore, 'h3.example')
    await resolveWidgetUserIdForHostname(documentStore, 'h1.example')

    expect(documentStore.getDocument).toHaveBeenCalledTimes(4)
  })
})
