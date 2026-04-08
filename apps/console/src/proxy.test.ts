/** @vitest-environment node */

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const tenantStatusSlugForHost = vi.hoisted(() => vi.fn<[], string | undefined>())

vi.mock('@/lib/tenant-api-root-map', () => ({
  tenantStatusSlugForHost,
}))

import { proxy } from './proxy'

describe('proxy', () => {
  beforeEach(() => {
    tenantStatusSlugForHost.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 for scanner prefix paths', () => {
    const res = proxy(new NextRequest(new URL('http://localhost/wp-admin')))
    expect(res.status).toBe(403)
  })

  it('returns 403 for .php probe paths', () => {
    const res = proxy(new NextRequest(new URL('http://localhost/admin.php')))
    expect(res.status).toBe(403)
  })

  it('returns next() for normal paths when no tenant slug', () => {
    const res = proxy(new NextRequest(new URL('http://localhost/status')))
    expect(res.status).not.toBe(403)
    tenantStatusSlugForHost.mockReturnValue(undefined)
  })

  it('rewrites / when tenantStatusSlugForHost returns a slug', () => {
    tenantStatusSlugForHost.mockReturnValue('chrisvogt')
    const res = proxy(
      new NextRequest(new URL('http://api.chrisvogt.local:5173/'), {
        headers: { host: 'api.chrisvogt.local:5173' },
      }),
    )
    expect(tenantStatusSlugForHost).toHaveBeenCalled()
    expect(res.status).toBe(200)
    const rewrite = res.headers.get('x-middleware-rewrite')
    expect(rewrite).toBeTruthy()
    expect(rewrite).toContain('/u/chrisvogt')
  })

  it('does not rewrite / when tenant slug is missing', () => {
    tenantStatusSlugForHost.mockReturnValue(undefined)
    const res = proxy(
      new NextRequest(new URL('http://localhost:5173/'), {
        headers: { host: 'localhost:5173' },
      }),
    )
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('prefers x-forwarded-host for tenant lookup', () => {
    tenantStatusSlugForHost.mockReturnValue('alice')
    proxy(
      new NextRequest(new URL('http://127.0.0.1:5173/'), {
        headers: {
          host: '127.0.0.1:5173',
          'x-forwarded-host': 'api.tenant.example',
        },
      }),
    )
    expect(tenantStatusSlugForHost).toHaveBeenCalledWith('api.tenant.example')
  })

  it('does not rewrite non-root paths even when slug exists', () => {
    tenantStatusSlugForHost.mockReturnValue('bob')
    const res = proxy(new NextRequest(new URL('http://localhost/widgets/spotify')))
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })
})
