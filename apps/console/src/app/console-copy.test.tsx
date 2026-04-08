import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getTenantDisplayHostMock, useAuthMock } = vi.hoisted(() => ({
  getTenantDisplayHostMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}))

vi.mock('next/link', () => ({
  default: (props: { href: string; children?: React.ReactNode; className?: string }) =>
    React.createElement('a', { href: props.href, className: props.className }, props.children),
}))

vi.mock('@/components/MarketingShell', () => ({
  MarketingShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/AuthScenePageShell', () => ({
  AuthScenePageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/tenantDisplay', () => ({
  getTenantDisplayHost: getTenantDisplayHostMock,
}))

vi.mock('@/auth/AuthContext', () => ({
  useAuth: useAuthMock,
}))

import AboutPage from './about/page'
import DocsPage, { metadata as docsMetadata } from './docs/page'
import DashboardPage, { metadata as dashboardMetadata } from './(main)/page'
import AuthPage, { metadata as authMetadata } from './(main)/auth/page'
import { AuthSection } from '@/sections/AuthSection'
import { SchemaSection } from '@/sections/SchemaSection'

describe('console page copy and metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTenantDisplayHostMock.mockReturnValue('console.chronogrove.com')
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      setError: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithEmail: vi.fn(),
      signInWithPhone: vi.fn(),
    })
  })

  it('uses updated dashboard, auth, and docs metadata', () => {
    expect(dashboardMetadata.title).toBe('Dashboard')
    expect(dashboardMetadata.description).toBe(
      'Live provider health, sync status, and key metrics for the Chronogrove console.',
    )
    expect(authMetadata.description).toBe(
      'Sign in to access the Chronogrove console, session helpers, and sync tools.',
    )
    expect(docsMetadata.description).toBe(
      'Where to find Chronogrove API routes, repository docs, and local development notes.',
    )
  })

  it('renders the updated about and docs copy', () => {
    const aboutHtml = renderToStaticMarkup(<AboutPage />)
    const docsHtml = renderToStaticMarkup(<DocsPage />)

    expect(aboutHtml).toContain('sync controls for operators')
    expect(aboutHtml).toContain('custom domains and public API/status surfaces per site')
    expect(docsHtml).toContain('In this console')
    expect(docsHtml).not.toContain('In this deployment')
  })

  it('renders the updated auth section copy', () => {
    const authPageHtml = renderToStaticMarkup(<AuthPage />)
    const authSectionHtml = renderToStaticMarkup(<AuthSection />)

    expect(authPageHtml).toContain('Sign in')
    expect(authSectionHtml).toContain('Visit chronogrove.com')
    expect(authSectionHtml).toContain('Chronogrove console access.')
  })

  it('renders the dashboard page and updated schema copy', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'u1' },
      loading: false,
    })

    const dashboardHtml = renderToStaticMarkup(<DashboardPage />)
    const schemaHtml = renderToStaticMarkup(<SchemaSection />)

    expect(dashboardHtml).toContain('console.chronogrove.com')
    expect(schemaHtml).toContain('Explore the full Chronogrove surface here')
  })
})
