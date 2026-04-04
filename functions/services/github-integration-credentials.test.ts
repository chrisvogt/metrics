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

  it('loadGitHubAuthForUser returns null when document is missing', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue(undefined),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when document is a non-object', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue('not-a-doc'),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when credential envelope is missing', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'g',
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when githubUsername is not a string', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 12345,
        credentialEnvelope: encryptJsonEnvelope('u1', { accessToken: 't' }),
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when githubUsername is empty', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: '',
        credentialEnvelope: encryptJsonEnvelope('u1', { accessToken: 't' }),
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when credential envelope schema is unsupported', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const env = encryptJsonEnvelope('u1', { accessToken: 't' })
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'g',
        credentialEnvelope: { ...env, schemaVersion: 0, v: 0 },
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when decrypt fails', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'g',
        credentialEnvelope: {
          schemaVersion: 1,
          keyVersion: 1,
          iv: Buffer.alloc(12, 1).toString('base64'),
          tag: Buffer.alloc(16, 2).toString('base64'),
          ciphertext: Buffer.alloc(32, 3).toString('base64'),
        },
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser returns null when decrypted payload omits accessToken', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'g',
        credentialEnvelope: encryptJsonEnvelope('u1', { refreshToken: 'r' }),
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser skips refresh when access token is not near expiry', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'tok',
          refreshToken: 'r1',
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        }),
      }),
    } as unknown as DocumentStore
    const auth = await loadGitHubAuthForUser(documentStore, 'u1')
    expect(auth).toEqual({ accessToken: 'tok', githubUsername: 'gh-user' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser skips refresh when expiresAt is invalid ISO', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'tok',
          refreshToken: 'r1',
          expiresAt: 'not-a-date',
        }),
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toEqual({
      accessToken: 'tok',
      githubUsername: 'gh-user',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser returns stale access token when expired but refresh token is absent', async () => {
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'stale',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      }),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toEqual({
      accessToken: 'stale',
      githubUsername: 'gh-user',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser returns null on refresh when client secret is not configured', async () => {
    delete process.env.GITHUB_APP_CLIENT_SECRET
    delete process.env.GITHUB_OAUTH_CLIENT_SECRET
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
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
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser returns null on refresh when OAuth client is not configured', async () => {
    delete process.env.GITHUB_APP_CLIENT_ID
    delete process.env.GITHUB_OAUTH_CLIENT_ID
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
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
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser returns null when refresh throws', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'bad_refresh' }),
    })
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
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
      mergeDocument: vi.fn(),
    } as unknown as DocumentStore
    expect(await loadGitHubAuthForUser(documentStore, 'u1')).toBeNull()
  })

  it('loadGitHubAuthForUser refreshes in memory when mergeDocument is unavailable', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mem-tok',
        token_type: 'bearer',
        expires_in: 1800,
      }),
    })
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
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
    } as unknown as DocumentStore
    const auth = await loadGitHubAuthForUser(documentStore, 'u1')
    expect(auth).toEqual({ accessToken: 'mem-tok', githubUsername: 'gh-user' })
    expect(fetchMock).toHaveBeenCalled()
  })

  it('loadGitHubAuthForUser keeps refreshToken when refresh response omits refresh_token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mem-tok',
        token_type: 'bearer',
      }),
    })
    const mergeDocument = vi.fn().mockResolvedValue(undefined)
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
    const documentStore = {
      getDocument: vi.fn().mockResolvedValue({
        status: 'connected',
        githubUsername: 'gh-user',
        credentialEnvelope: encryptJsonEnvelope('u1', {
          accessToken: 'old',
          refreshToken: 'keep-me',
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      }),
      mergeDocument,
    } as unknown as DocumentStore
    await loadGitHubAuthForUser(documentStore, 'u1')
    expect(mergeDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        credentialEnvelope: expect.anything(),
      }),
    )
  })

  it('mergeCredentialRefresh skips Firestore merge when mergeDocument is absent', async () => {
    const { mergeCredentialRefresh } = await import('./github-integration-credentials.js')
    const out = await mergeCredentialRefresh(
      {} as DocumentStore,
      'users/u1/integrations/github',
      'u1',
      { accessToken: 't' },
    )
    expect(out).toEqual({ accessToken: 't' })
  })

  it('loadGitHubAuthForUser omits refreshed expiresAt when GitHub omits expires_in', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'n',
        token_type: 'bearer',
        expires_in: Number.POSITIVE_INFINITY,
      }),
    })
    const mergeDocument = vi.fn().mockResolvedValue(undefined)
    const { loadGitHubAuthForUser } = await import('./github-integration-credentials.js')
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
    await loadGitHubAuthForUser(documentStore, 'u1')
    expect(mergeDocument).toHaveBeenCalled()
  })
})
