import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { headers } from 'next/headers'

const { fetchWidgetStatusRowMock } = vi.hoisted(() => ({
  fetchWidgetStatusRowMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve(new Headers({ host: 'api.example.com', 'x-forwarded-host': 'api.example.com' })),
  ),
}))

vi.mock('@/lib/server-widget-fetch-origin', () => ({
  getServerWidgetFetchOrigin: vi.fn(() => Promise.resolve('https://api.example.com')),
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children?: React.ReactNode; rel?: string }) =>
    React.createElement('a', { href: props.href, rel: props.rel }, props.children),
}))

vi.mock('@/lib/widget-status', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/widget-status')>()
  return {
    ...actual,
    WIDGET_STATUS_PROVIDERS: [
      { id: 'okrow', label: 'OK row' },
      { id: 'errrow', label: 'Error row' },
      { id: 'zerorow', label: 'Zero status code' },
      { id: 'failrow', label: 'HTTP fail' },
    ],
    fetchWidgetStatusRow: fetchWidgetStatusRowMock,
  }
})

import PublicTenantStatusPage, { generateMetadata } from './page'

describe('PublicTenantStatusPage generateMetadata', () => {
  it('builds title, description, and robots from username', async () => {
    const m = await generateMetadata({
      params: Promise.resolve({ username: 'alice' }),
    })
    expect(m.title).toBe('@alice · status')
    expect(m.description).toBe('Public widget API status for alice on Chronogrove.')
    expect(m.robots).toEqual({ index: true, follow: true })
  })
})

describe('PublicTenantStatusPage', () => {
  beforeEach(() => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ host: 'api.example.com', 'x-forwarded-host': 'api.example.com' }),
    )
    fetchWidgetStatusRowMock.mockImplementation(
      async (
        _origin: string,
        username: string,
        providerId: string,
        label: string,
        opts?: { debug?: boolean },
      ) => {
        const path = `/api/widgets/${providerId}?username=${encodeURIComponent(username)}`
        if (providerId === 'okrow') {
          return {
            label,
            path,
            httpStatus: 200,
            ok: true,
            ms: 12,
            lastSynced: '2024-06-01T12:00:00.000Z',
            error: null,
          }
        }
        if (providerId === 'errrow') {
          return {
            label,
            path,
            httpStatus: 0,
            ok: false,
            ms: 0,
            lastSynced: null,
            error: 'network failed',
          }
        }
        if (providerId === 'zerorow') {
          return {
            label,
            path,
            httpStatus: 0,
            ok: false,
            ms: 0,
            lastSynced: null,
            error: null,
          }
        }
        if (opts?.debug) {
          return {
            label,
            path,
            httpStatus: 503,
            ok: false,
            ms: 0,
            lastSynced: null,
            error: null,
            debugDetail: 'debug-fragment',
          }
        }
        return {
          label,
          path,
          httpStatus: 503,
          ok: false,
          ms: 0,
          lastSynced: null,
          error: null,
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders table rows for ok, error, and failed HTTP states', async () => {
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
    })
    const html = renderToStaticMarkup(el)
    expect(html).toContain('@bob')
    expect(html).toContain('OK row')
    expect(html).toContain('Error row')
    expect(html).toContain('Zero status code')
    expect(html).toContain('HTTP fail')
    expect(html).toContain('12ms')
    expect(html).toContain('503')
    expect(html).toContain('Chronogrove')
    expect(html).toContain('href="https://chronogrove.com"')
    expect(fetchWidgetStatusRowMock).toHaveBeenCalled()
  })

  it('shows debug banner, Debug column, and debugDetail when status_debug=1', async () => {
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
      searchParams: Promise.resolve({ status_debug: '1' }),
    })
    const html = renderToStaticMarkup(el)
    expect(html).toContain('data-testid="status-debug-banner"')
    expect(html).toContain('>Debug</th>')
    expect(html).toContain('debug-fragment')
    expect(fetchWidgetStatusRowMock).toHaveBeenCalledWith(
      expect.any(String),
      'bob',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ debug: true }),
    )
  })

  it('enables debug for status_debug=true', async () => {
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
      searchParams: Promise.resolve({ status_debug: 'true' }),
    })
    expect(renderToStaticMarkup(el)).toContain('status-debug-banner')
  })

  it('enables debug when status_debug is an array containing 1', async () => {
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
      searchParams: Promise.resolve({ status_debug: ['0', '1'] }),
    })
    expect(renderToStaticMarkup(el)).toContain('status-debug-banner')
  })

  it('uses x-forwarded-host when host header is absent', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-forwarded-host': 'api.example.com' }))
    await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
    })
    expect(fetchWidgetStatusRowMock).toHaveBeenCalled()
  })

  it('shows hostname-map copy when tenant host slug matches username', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME', 'api.example.com=bob')
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
    })
    const html = renderToStaticMarkup(el)
    expect(html).toContain('/widgets/:provider')
    expect(fetchWidgetStatusRowMock).toHaveBeenCalledWith(
      expect.any(String),
      'bob',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ resolveUserLikePublicWidgets: true }),
    )
  })

  it('uses first x-forwarded-host label for tenant map when Host is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT_API_ROOT_TO_USERNAME', 'api.example.com=bob')
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-host': 'api.example.com, edge.internal' }),
    )
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
    })
    expect(renderToStaticMarkup(el)).toContain('/widgets/:provider')
    expect(fetchWidgetStatusRowMock).toHaveBeenCalledWith(
      expect.any(String),
      'bob',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ resolveUserLikePublicWidgets: true }),
    )
  })
})
