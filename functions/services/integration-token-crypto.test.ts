import { afterEach, describe, expect, it, beforeEach } from 'vitest'

describe('integration-token-crypto', () => {
  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_MASTER_KEY = Buffer.alloc(32, 7).toString('base64')
  })

  afterEach(() => {
    delete process.env.INTEGRATION_TOKEN_MASTER_KEY
  })

  it('round-trips JSON for a fixed user id', async () => {
    const { encryptJsonEnvelope, decryptJsonEnvelope } = await import('./integration-token-crypto.js')
    const uid = 'firebaseUid1'
    const plain = { oauthToken: 't', oauthTokenSecret: 's' }
    const env = encryptJsonEnvelope(uid, plain)
    expect(decryptJsonEnvelope(uid, env)).toEqual(plain)
  })

  it('uses distinct ciphertext for different uids with same plaintext', async () => {
    const { encryptJsonEnvelope } = await import('./integration-token-crypto.js')
    const plain = { oauthToken: 't', oauthTokenSecret: 's' }
    const a = encryptJsonEnvelope('u1', plain)
    const b = encryptJsonEnvelope('u2', plain)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })
})
