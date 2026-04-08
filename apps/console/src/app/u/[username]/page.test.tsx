import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    fetchWidgetStatusRowMock.mockImplementation(
      async (_origin: string, username: string, providerId: string, label: string) => {
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

  it('renders table rows for ok, error, and failed HTTP states', async () => {
    const el = await PublicTenantStatusPage({
      params: Promise.resolve({ username: 'bob' }),
    })
    const html = renderToStaticMarkup(el)
    expect(html).toContain('@bob')
    expect(html).toContain('OK row')
    expect(html).toContain('Error row')
    expect(html).toContain('HTTP fail')
    expect(html).toContain('12ms')
    expect(html).toContain('503')
    expect(html).toContain('Chronogrove')
    expect(html).toContain('href="https://chronogrove.com"')
    expect(fetchWidgetStatusRowMock).toHaveBeenCalled()
  })
})
