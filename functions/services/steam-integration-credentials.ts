import type { DocumentStore } from '../ports/document-store.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { USER_INTEGRATIONS_SEGMENT } from '../config/future-tenant-collections.js'
import {
  decryptJsonEnvelope,
  readCredentialEnvelopeSchemaVersion,
  type IntegrationCredentialEnvelope,
} from './integration-token-crypto.js'

export const STEAM_INTEGRATION_ID = 'steam'

export interface SteamOAuthCredentialPayload {
  accessToken: string
}

export interface ResolvedSteamApiAuth {
  mode: 'oauth'
  steamId: string
  accessToken: string
}

export async function loadSteamAuthForUser(
  documentStore: DocumentStore,
  uid: string
): Promise<ResolvedSteamApiAuth | null> {
  const path = `${getUsersCollectionPath()}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${STEAM_INTEGRATION_ID}`
  const doc = await documentStore.getDocument<Record<string, unknown>>(path)
  if (!doc || typeof doc !== 'object') return null

  const status = doc.status
  if (status !== 'connected') return null

  const steamId = typeof doc.steamId === 'string' ? doc.steamId : ''
  if (!steamId) return null

  const env = doc.credentialEnvelope as IntegrationCredentialEnvelope | undefined
  const schemaVersion = env ? readCredentialEnvelopeSchemaVersion(env) : undefined
  if (!env || schemaVersion !== 1) return null

  try {
    const creds = decryptJsonEnvelope<SteamOAuthCredentialPayload>(uid, env)
    if (!creds.accessToken) return null
    return {
      mode: 'oauth',
      steamId,
      accessToken: creds.accessToken,
    }
  } catch {
    return null
  }
}
