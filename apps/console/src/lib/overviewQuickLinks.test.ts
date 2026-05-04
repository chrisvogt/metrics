import { describe, expect, it } from 'vitest'

import { CHRONOGROVE_GITHUB_REPO } from '@/lib/chronogroveRepo'

import { buildOverviewQuickLinks } from './overviewQuickLinks'

describe('buildOverviewQuickLinks', () => {
  it('returns docs, about, and sign-in when signed out', () => {
    expect(buildOverviewQuickLinks({ user: null, publicUsername: null })).toEqual([
      { href: '/docs/', label: 'Docs' },
      { href: '/about/', label: 'About' },
      { href: '/auth/', label: 'Sign in' },
    ])
  })

  it('includes settings, docs, public status, and GitHub when signed in with a username', () => {
    expect(
      buildOverviewQuickLinks({ user: { uid: 'x' }, publicUsername: 'alice_bob' })
    ).toEqual([
      { href: '/user-settings/', label: 'Settings' },
      { href: '/docs/', label: 'Docs' },
      { href: '/u/alice_bob/', label: 'Public status page' },
      { href: CHRONOGROVE_GITHUB_REPO, label: 'GitHub', external: true },
    ])
  })

  it('encodes reserved characters in the public status path', () => {
    const links = buildOverviewQuickLinks({ user: { uid: 'x' }, publicUsername: 'a/b' })
    expect(links[2]).toEqual({
      href: '/u/a%2Fb/',
      label: 'Public status page',
    })
  })

  it('uses account setup instead of public page when there is no username', () => {
    expect(buildOverviewQuickLinks({ user: { uid: 'x' }, publicUsername: null })).toEqual([
      { href: '/user-settings/', label: 'Settings' },
      { href: '/docs/', label: 'Docs' },
      { href: '/onboarding/', label: 'Account setup' },
      { href: CHRONOGROVE_GITHUB_REPO, label: 'GitHub', external: true },
    ])
  })
})
