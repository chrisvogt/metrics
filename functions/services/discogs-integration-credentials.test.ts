import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import { encryptJsonEnvelope } from './integration-token-crypto.js'
import { DISCOGS_INTEGRATION_ID, loadDiscogsAuthForUser } from './discogs-integration-credentials.js'

describe('loadDiscogsAuthForUser', () => {
  let documentStore: DocumentStore

  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_MASTER_KEY = Buffer.alloc(32, 9).toString('base64')
    process.env.DISCOGS_CONSUMER_KEY = 'dck'
    process.env.DISCOGS_CONSUMER_SECRET = 'dcs'
    documentStore = { getDocument: vi.fn() }
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    delete process.env.DISCOGS_CONSUMER_KEY
    delete process.env.DISCOGS_CONSUMER_SECRET
  })

  it('returns null when integration doc is missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when status is not connected', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({ status: 'pending_oauth' })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when document is not a non-null object', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when discogsUsername is not a string', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 123 as unknown as string,
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when credentialEnvelope is missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when discogsUsername is empty', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: '',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when envelope schema is unsupported', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
      credentialEnvelope: { schemaVersion: 2, iv: 'x', tag: 'x', ciphertext: 'x' },
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when consumer credentials are not configured', async () => {
    delete process.env.DISCOGS_CONSUMER_SECRET
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when decrypted payload lacks tokens', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: '', oauthTokenSecret: '' }),
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when ciphertext cannot be decrypted', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
      credentialEnvelope: {
        schemaVersion: 1,
        keyVersion: 1,
        iv: Buffer.alloc(12, 1).toString('base64'),
        tag: Buffer.alloc(16, 2).toString('base64'),
        ciphertext: Buffer.alloc(8, 3).toString('base64'),
      },
    })
    await expect(loadDiscogsAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns resolved auth', async () => {
    const creds = { oauthToken: 'tok', oauthTokenSecret: 'sec' }
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      discogsUsername: 'pat',
      credentialEnvelope: encryptJsonEnvelope('u1', creds),
    })
    const auth = await loadDiscogsAuthForUser(documentStore, 'u1')
    expect(auth).toMatchObject({
      mode: 'oauth',
      consumerKey: 'dck',
      consumerSecret: 'dcs',
      discogsUsername: 'pat',
      oauthToken: 'tok',
      oauthTokenSecret: 'sec',
    })
  })

  it('uses integrations segment path', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    await loadDiscogsAuthForUser(documentStore, 'uid-z')
    expect(documentStore.getDocument).toHaveBeenCalledWith(
      expect.stringContaining(`/integrations/${DISCOGS_INTEGRATION_ID}`)
    )
  })
})
