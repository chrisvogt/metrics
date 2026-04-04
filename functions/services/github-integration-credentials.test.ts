import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentStore } from '../ports/document-store.js'
import { encryptJsonEnvelope } from './integration-token-crypto.js'

const fetchMock = vi.fn()

describe('github-integration-credentials', () => {
  const masterKeyB64 = Buffer.alloc(32, 9).toString('base64')

  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    process.env.INTEGRATION_TOKEN_MASTER_KEY = masterKeyB64
    process.env.GITHUB_APP_CLIENT_ID = 'cid'
    process.env.GITHUB_APP_CLIENT_SECRET = 'csec'
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    delete process.env.GITHUB_APP_CLIENT_ID
    delete process.env.GITHUB_APP_CLIENT_SECRET
    vi.unstubAllGlobals()
  })

  it('loadGitHubAuthForUser returns decrypted OAuth credentials when connected', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'tok',
        }),
      }),
    } as unknown as DocumentStore

    const auth = await loadGitHubAuthForUser(documentStore, 'u1')
    expect(auth).toEqual({ accessToken: 'tok', githubUsername: 'gh-user' })
  })

  it('loadGitHubAuthForUser returns null when not connected', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({ status: 'pending_oauth' }),
    } as unknown as DocumentStore

    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser refreshes expired tokens when mergeDocument is available', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-tok',
        token_type: 'bearer',
        expires_in: 3600,
      }),
    })

    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const mergeDocument = vi.fn().mockResolvedValue(undefined)
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'old',
          refreshToken: 'r1',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      }),
      mergeDocument,
    } as unknown as DocumentStore

    const auth = await loadGitHubAuthForUser(documentStore, 'u1')
    expect(auth?.accessToken).toBe('new-tok')
    expect(mergeDocument).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalled()
  })
})
