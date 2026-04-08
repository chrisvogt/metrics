/** @vitest-environment jsdom */

import * as React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  usePathnameMock,
  pushMock,
  replaceMock,
  useAuthMock,
  mustVerifyEmailBeforeConsoleMock,
  layoutMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
  mustVerifyEmailBeforeConsoleMock: vi.fn(),
  layoutMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/auth/AuthContext', () => ({
  useAuth: useAuthMock,
}))

vi.mock('@/lib/emailVerificationGate', () => ({
  mustVerifyEmailBeforeConsole: mustVerifyEmailBeforeConsoleMock,
}))

vi.mock('@/layout/Layout', () => ({
  Layout: (props: {
    user: unknown
    activeSection: string
    onSectionChange: (section: 'overview' | 'schema' | 'status' | 'api' | 'sync' | 'auth') => void
    children: React.ReactNode
  }) => {
    layoutMock(props)
    return (
      <div>
        <div data-testid="section">{props.activeSection}</div>
        <button type="button" onClick={() => props.onSectionChange('sync')}>
          Go sync
        </button>
        {props.children}
      </div>
    )
  },
}))

import MainLayout from './layout'

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/')
    useAuthMock.mockReturnValue({ user: null, loading: false })
    mustVerifyEmailBeforeConsoleMock.mockReturnValue(false)
  })

  it('shows a loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true })

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    )

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(layoutMock).not.toHaveBeenCalled()
  })

  it('redirects signed-out users to /auth/ for protected routes', async () => {
    usePathnameMock.mockReturnValue('/status')

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    )

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth/'))
    expect(layoutMock).toHaveBeenCalled()
  })

  it('redirects signed-in users with unverified email to /verify-email/', async () => {
    const user = { uid: 'u1' }
    useAuthMock.mockReturnValue({ user, loading: false })
    mustVerifyEmailBeforeConsoleMock.mockReturnValue(true)

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    )

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/verify-email/'))
  })

  it('redirects signed-in users away from /auth back to dashboard', async () => {
    usePathnameMock.mockReturnValue('/auth')
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, loading: false })

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    )

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
    expect(screen.getByTestId('section')).toHaveTextContent('auth')
  })

  it('maps section changes to route pushes', async () => {
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, loading: false })
    const user = userEvent.setup()

    render(
      <MainLayout>
        <div>child</div>
      </MainLayout>,
    )

    await user.click(screen.getByRole('button', { name: 'Go sync' }))

    expect(pushMock).toHaveBeenCalledWith('/sync/')
    expect(screen.getByText('child')).toBeInTheDocument()
    expect(screen.getByTestId('section')).toHaveTextContent('overview')
  })
})
