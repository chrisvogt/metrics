import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

import { getIntegrationTokenMasterKeyBytes } from '../config/backend-config.js'

const AES_KEY_LEN = 32
const GCM_IV_LEN = 12

const hkdfInfoForUid = (uid: string) => Buffer.from(`chronogrove:integration:v1:${uid}`, 'utf8')

export function deriveUserIntegrationKey(uid: string): Buffer {
  const ikm = getIntegrationTokenMasterKeyBytes()
  return hkdfSync('sha256', ikm, Buffer.alloc(0), hkdfInfoForUid(uid), AES_KEY_LEN)
}

export interface IntegrationCredentialEnvelope {
  v: 1
  iv: string
  tag: string
  ciphertext: string
}

export function encryptJsonEnvelope(uid: string, payload: unknown): IntegrationCredentialEnvelope {
  const key = deriveUserIntegrationKey(uid)
  const iv = randomBytes(GCM_IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function decryptJsonEnvelope<T>(uid: string, envelope: IntegrationCredentialEnvelope): T {
  if (envelope.v !== 1) {
    throw new Error('Unsupported credential envelope version')
  }
  const key = deriveUserIntegrationKey(uid)
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
