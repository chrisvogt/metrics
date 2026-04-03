import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import { encryptJsonEnvelope } from './integration-token-crypto.js'
import { FLICKR_INTEGRATION_ID, loadFlickrAuthForUser } from './flickr-integration-credentials.js'

describe('loadFlickrAuthForUser', () => {
  let documentStore: DocumentStore

  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_MASTER_KEY = Buffer.alloc(32, 9).toString('base64')
    process.env.FLICKR_API_KEY = 'ck'
    process.env.FLICKR_API_SECRET = 'cs'
    documentStore = { getDocument: vi.fn() }
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
    delete process.env.FLICKR_API_KEY
    delete process.env.FLICKR_API_SECRET
  })

  it('returns null when integration doc is missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(undefined)
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when status is not connected', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({ status: 'pending_oauth' })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when document is not a non-null object', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when flickrUserNsid is not a string', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 12345 as unknown as string,
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when credentialEnvelope is missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when flickrUserNsid is empty', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: '',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when envelope schema is unsupported', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      credentialEnvelope: { schemaVersion: 2, iv: 'x', tag: 'x', ciphertext: 'x' },
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when consumer credentials are not configured', async () => {
    delete process.env.FLICKR_API_SECRET
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when decrypted payload lacks tokens', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: '', oauthTokenSecret: '' }),
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns null when ciphertext cannot be decrypted', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      credentialEnvelope: {
        schemaVersion: 1,
        keyVersion: 1,
        iv: Buffer.alloc(12, 1).toString('base64'),
        tag: Buffer.alloc(16, 2).toString('base64'),
        ciphertext: Buffer.alloc(8, 3).toString('base64'),
      },
    })
    await expect(loadFlickrAuthForUser(documentStore, 'u1')).resolves.toBeNull()
  })

  it('returns resolved auth including flickrUsername when present', async () => {
    const creds = { oauthToken: 'tok', oauthTokenSecret: 'sec' }
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      flickrUsername: 'ernie',
      credentialEnvelope: encryptJsonEnvelope('u1', creds),
    })
    const auth = await loadFlickrAuthForUser(documentStore, 'u1')
    expect(auth).toMatchObject({
      mode: 'oauth',
      consumerKey: 'ck',
      consumerSecret: 'cs',
      userNsid: 'nsid',
      ...creds,
      flickrUsername: 'ernie',
    })
    expect(documentStore.getDocument).toHaveBeenCalledWith(`users/u1/integrations/${FLICKR_INTEGRATION_ID}`)
  })

  it('omits flickrUsername when stored value is not a string', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      status: 'connected',
      flickrUserNsid: 'nsid',
      flickrUsername: null,
      credentialEnvelope: encryptJsonEnvelope('u1', { oauthToken: 't', oauthTokenSecret: 's' }),
    })
    const auth = await loadFlickrAuthForUser(documentStore, 'u1')
    expect(auth?.flickrUsername).toBeUndefined()
  })
})
