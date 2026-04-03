import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

import { getIntegrationTokenMasterKeyBytes } from '../config/backend-config.js'

const AES_KEY_LEN = 32
const GCM_IV_LEN = 12

/**
 * Envelope **JSON shape** (fields: schemaVersion, keyVersion?, iv, tag, ciphertext).
 * Bump only when the serialized structure changes, not when rotating the master key.
 */
export const INTEGRATION_CREDENTIAL_SCHEMA_VERSION = 1 as const

/**
 * Master-key / KDF generation. `1` must keep the same HKDF info string as the original
 * implementation so existing Firestore documents keep decrypting. Future versions (2, …)
 * get distinct info strings + (when implemented) distinct IKM lookup for rotation.
 */
export const INTEGRATION_CREDENTIAL_KEY_VERSION = 1 as const

function hkdfInfoForUid(uid: string, keyVersion: number): Buffer {
  if (keyVersion === 1) {
    return Buffer.from(`chronogrove:integration:v1:${uid}`, 'utf8')
  }
  return Buffer.from(`chronogrove:integration:v1:k${keyVersion}:${uid}`, 'utf8')
}

export function deriveUserIntegrationKey(uid: string, keyVersion: number): Buffer {
  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new Error('Invalid integration keyVersion for derivation')
  }
  const ikm = getIntegrationTokenMasterKeyBytes()
  const raw = hkdfSync('sha256', ikm, Buffer.alloc(0), hkdfInfoForUid(uid, keyVersion), AES_KEY_LEN)
  return Buffer.from(raw)
}

export interface IntegrationCredentialEnvelope {
  /** Current field name for envelope layout version. */
  schemaVersion?: number
  /** Legacy stored field; treated like `schemaVersion` when present. */
  v?: number
  /**
   * Which master-key generation this ciphertext was derived under (see `deriveUserIntegrationKey`).
   * Omitted on older writes; treated as `1` when missing for backward compatibility.
   */
  keyVersion?: number
  iv: string
  tag: string
  ciphertext: string
}

/** Resolve layout version from new or legacy Firestore payloads. */
export function readCredentialEnvelopeSchemaVersion(
  envelope: IntegrationCredentialEnvelope
): number | undefined {
  return envelope.schemaVersion ?? envelope.v
}

export function encryptJsonEnvelope(
  uid: string,
  payload: unknown,
  keyVersion: number = INTEGRATION_CREDENTIAL_KEY_VERSION
): IntegrationCredentialEnvelope {
  const key = deriveUserIntegrationKey(uid, keyVersion)
  const iv = randomBytes(GCM_IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    schemaVersion: INTEGRATION_CREDENTIAL_SCHEMA_VERSION,
    keyVersion,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function decryptJsonEnvelope<T>(uid: string, envelope: IntegrationCredentialEnvelope): T {
  const schemaVersion = readCredentialEnvelopeSchemaVersion(envelope)
  if (schemaVersion !== INTEGRATION_CREDENTIAL_SCHEMA_VERSION) {
    throw new Error('Unsupported credential envelope schemaVersion')
  }
  const keyVersion = envelope.keyVersion ?? 1
  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new Error('Invalid credential envelope keyVersion')
  }
  const key = deriveUserIntegrationKey(uid, keyVersion)
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
