/** @vitest-environment node */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tenantStatusSlugForHostAsync = vi.hoisted(() =>
  vi.fn<[], Promise<string | undefined>>()
)

vi.mock('@/lib/tenant-api-root-map', () => ({
  tenantStatusSlugForHostAsync,
}))

import { proxy } from './proxy'

describe('proxy', () => {
  beforeEach(() => {
    tenantStatusSlugForHostAsync.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 for scanner prefix paths', async () => {
    const res = await proxy(new NextRequest(new URL('http://localhost/wp-admin')))
    expect(res.status).toBe(403)
  })

  it('returns 403 for .php probe paths', async () => {
    const res = await proxy(new NextRequest(new URL('http://localhost/admin.php')))
    expect(res.status).toBe(403)
  })

  it('returns next() for normal paths when no tenant slug', async () => {
    const res = await proxy(new NextRequest(new URL('http://localhost/status')))
    expect(res.status).not.toBe(403)
    tenantStatusSlugForHostAsync.mockResolvedValue(undefined)
  })

  it('rewrites / when tenantStatusSlugForHostAsync returns a slug', async () => {
    tenantStatusSlugForHostAsync.mockResolvedValue('chrisvogt')
    const res = await proxy(
      new NextRequest(new URL('http://api.chrisvogt.local:5173/'), {
        headers: { host: 'api.chrisvogt.local:5173' },
      }),
    )
    expect(tenantStatusSlugForHostAsync).toHaveBeenCalled()
    expect(res.status).toBe(200)
    const rewrite = res.headers.get('x-middleware-rewrite')
    expect(rewrite).toBeTruthy()
    expect(rewrite).toContain('/u/chrisvogt')
  })

  it('does not rewrite / when tenant slug is missing', async () => {
    tenantStatusSlugForHostAsync.mockResolvedValue(undefined)
    const res = await proxy(
      new NextRequest(new URL('http://localhost:5173/'), {
        headers: { host: 'localhost:5173' },
      }),
    )
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('prefers x-forwarded-host for tenant lookup', async () => {
    tenantStatusSlugForHostAsync.mockResolvedValue('alice')
    await proxy(
      new NextRequest(new URL('http://127.0.0.1:5173/'), {
        headers: {
          host: '127.0.0.1:5173',
          'x-forwarded-host': 'api.tenant.example',
        },
      }),
    )
    expect(tenantStatusSlugForHostAsync).toHaveBeenCalledWith('api.tenant.example')
  })

  it('uses first x-forwarded-host only when multiple hosts are comma-separated', async () => {
    tenantStatusSlugForHostAsync.mockResolvedValue('alice')
    await proxy(
      new NextRequest(new URL('http://127.0.0.1:5173/'), {
        headers: {
          host: '127.0.0.1:5173',
          'x-forwarded-host': 'api.tenant.example, proxy.internal',
        },
      }),
    )
    expect(tenantStatusSlugForHostAsync).toHaveBeenCalledWith('api.tenant.example')
  })

  it('does not rewrite non-root paths even when slug exists', async () => {
    tenantStatusSlugForHostAsync.mockResolvedValue('bob')
    const res = await proxy(new NextRequest(new URL('http://localhost/widgets/spotify')))
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })
})
