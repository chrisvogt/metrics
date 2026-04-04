import { describe, expect, it, vi } from 'vitest'

import { resolveGitShortSha } from './buildSha.js'

describe('resolveGitShortSha', () => {
  it('prefers NEXT_PUBLIC_GIT_SHA over the other env sources', () => {
    expect(
      resolveGitShortSha(
        {
          NEXT_PUBLIC_GIT_SHA: '1234567890',
          GITHUB_SHA: 'abcdef0',
        },
        () => 'ignored',
      ),
    ).toBe('1234567')
  })

  it('checks CI provider env vars in order', () => {
    expect(
      resolveGitShortSha(
        {
          VERCEL_GIT_COMMIT_SHA: '7654321abcdef',
        },
        () => 'ignored',
      ),
    ).toBe('7654321')

    expect(
      resolveGitShortSha(
        {
          CF_PAGES_COMMIT_SHA: '89abcdeffff',
        },
        () => 'ignored',
      ),
    ).toBe('89abcde')

    expect(
      resolveGitShortSha(
        {
          GITHUB_SHA: 'fedcba987654321',
        },
        () => 'ignored',
      ),
    ).toBe('fedcba9')

    expect(
      resolveGitShortSha(
        {
          COMMIT_SHA: '1122334455',
        },
        () => 'ignored',
      ),
    ).toBe('1122334')
  })

  it('strips a leading v and trims whitespace', () => {
    expect(
      resolveGitShortSha(
        {
          NEXT_PUBLIC_GIT_SHA: '  v3682d0780378fc5e  ',
        },
        () => 'ignored',
      ),
    ).toBe('3682d07')
  })

  it('falls back to git when env is unset', () => {
    const getGitSha = vi.fn(() => '497b0aa\n')

    expect(resolveGitShortSha({}, getGitSha)).toBe('497b0aa')
    expect(getGitSha).toHaveBeenCalledTimes(1)
  })

  it('returns unknown when git lookup throws', () => {
    expect(
      resolveGitShortSha({}, () => {
        throw new Error('git unavailable')
      }),
    ).toBe('unknown')
  })

  it('keeps short non-empty values as-is after normalization', () => {
    expect(
      resolveGitShortSha(
        {
          NEXT_PUBLIC_GIT_SHA: 'abc',
        },
        () => 'ignored',
      ),
    ).toBe('abc')
  })
})
