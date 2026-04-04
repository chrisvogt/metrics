import { describe, expect, it } from 'vitest'
import { readGitHubAuthModeFromWidgetResponse } from './readGitHubAuthModeFromWidgetResponse'

describe('readGitHubAuthModeFromWidgetResponse', () => {
  it('returns oauth or env when present on the response body', () => {
    expect(readGitHubAuthModeFromWidgetResponse({ ok: true, githubAuthMode: 'oauth' })).toBe('oauth')
    expect(readGitHubAuthModeFromWidgetResponse({ githubAuthMode: 'env' })).toBe('env')
  })

  it('returns undefined for missing or invalid values', () => {
    expect(readGitHubAuthModeFromWidgetResponse(null)).toBeUndefined()
    expect(readGitHubAuthModeFromWidgetResponse({ ok: true })).toBeUndefined()
    expect(readGitHubAuthModeFromWidgetResponse({ githubAuthMode: 'pat' })).toBeUndefined()
  })
})
