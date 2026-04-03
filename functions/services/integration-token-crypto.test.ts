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
    expect(env.schemaVersion).toBe(1)
    expect(env.keyVersion).toBe(1)
    expect(env.v).toBeUndefined()
    expect(decryptJsonEnvelope(uid, env)).toEqual(plain)
  })

  it('treats missing keyVersion as 1 for backward compatibility', async () => {
    const { encryptJsonEnvelope, decryptJsonEnvelope } = await import('./integration-token-crypto.js')
    const uid = 'firebaseUid1'
    const plain = { x: 1 }
    const full = encryptJsonEnvelope(uid, plain)
    const legacyShape = {
      v: 1,
      iv: full.iv,
      tag: full.tag,
      ciphertext: full.ciphertext,
    }
    expect(decryptJsonEnvelope(uid, legacyShape as import('./integration-token-crypto.js').IntegrationCredentialEnvelope)).toEqual(plain)
  })

  it('uses distinct ciphertext for different uids with same plaintext', async () => {
    const { encryptJsonEnvelope } = await import('./integration-token-crypto.js')
    const plain = { oauthToken: 't', oauthTokenSecret: 's' }
    const a = encryptJsonEnvelope('u1', plain)
    const b = encryptJsonEnvelope('u2', plain)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('uses distinct keys for keyVersion 1 vs 2 (rotation hook)', async () => {
    const { deriveUserIntegrationKey } = await import('./integration-token-crypto.js')
    const uid = 'sameUid'
    expect(deriveUserIntegrationKey(uid, 1).equals(deriveUserIntegrationKey(uid, 2))).toBe(false)
  })
})
