/** @vitest-environment node */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('GET /internal/tenant-resolve', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original }
    fetchMock.mockReset()
    process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN = 'https://fn.example.com/app'
    delete process.env.TENANT_RESOLVE_FUNCTIONS_ORIGIN
    delete process.env.CHRONOGROVE_INTERNAL_API_KEY
  })

  afterEach(() => {
    process.env = original
  })

  it('returns null username when routing is disabled', async () => {
    delete process.env.ENABLE_FIRESTORE_TENANT_ROUTING
    const { GET } = await import('./route')
    const res = await GET(
      new NextRequest('http://localhost/internal/tenant-resolve?host=api.x.com')
    )
    expect(await res.json()).toEqual({ username: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('proxies Functions and returns username only', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 'secret-uid', username: 'Public' }),
    })
    const { GET } = await import('./route')
    const res = await GET(
      new NextRequest('http://localhost/internal/tenant-resolve?host=api.z.com')
    )
    expect(await res.json()).toEqual({ username: 'Public' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://fn.example.com/app/api/internal/resolve-tenant?host=api.z.com',
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('returns null when upstream response is not ok', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
    const { GET } = await import('./route')
    const res = await GET(
      new NextRequest('http://localhost/internal/tenant-resolve?host=a.com')
    )
    expect(await res.json()).toEqual({ username: null })
  })

  it('returns null when upstream fetch throws', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockRejectedValue(new Error('network'))
    const { GET } = await import('./route')
    const res = await GET(
      new NextRequest('http://localhost/internal/tenant-resolve?host=a.com')
    )
    expect(await res.json()).toEqual({ username: null })
  })

  it('forwards internal API key when configured', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    process.env.CHRONOGROVE_INTERNAL_API_KEY = 'k'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'u' }),
    })
    const { GET } = await import('./route')
    await GET(new NextRequest('http://localhost/internal/tenant-resolve?host=h.example'))
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'x-chronogrove-internal-key': 'k' },
      })
    )
  })

  it('returns null for missing host query', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    const { GET } = await import('./route')
    const res = await GET(new NextRequest('http://localhost/internal/tenant-resolve'))
    expect(await res.json()).toEqual({ username: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when upstream JSON has empty username string', async () => {
    process.env.ENABLE_FIRESTORE_TENANT_ROUTING = 'true'
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ username: '' }),
    })
    const { GET } = await import('./route')
    const res = await GET(
      new NextRequest('http://localhost/internal/tenant-resolve?host=api.empty.example')
    )
    expect(await res.json()).toEqual({ username: null })
  })
})
