import type { DocumentStore } from '../ports/document-store.js'
import { getDiscogsOAuthConfig } from '../config/backend-config.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { USER_INTEGRATIONS_SEGMENT } from '../config/future-tenant-collections.js'
import {
  decryptJsonEnvelope,
  readCredentialEnvelopeSchemaVersion,
  type IntegrationCredentialEnvelope,
} from './integration-token-crypto.js'
import type { DiscogsOAuthSigningAuth } from './discogs-oauth1a.js'

export const DISCOGS_INTEGRATION_ID = 'discogs'

export interface DiscogsOAuthCredentialPayload {
  oauthToken: string
  oauthTokenSecret: string
}

export interface ResolvedDiscogsApiAuth extends DiscogsOAuthSigningAuth {
  mode: 'oauth'
  discogsUsername: string
}

export async function loadDiscogsAuthForUser(
  documentStore: DocumentStore,
  uid: string
): Promise<ResolvedDiscogsApiAuth | null> {
  const path = `${getUsersCollectionPath()}/${uid}/${USER_INTEGRATIONS_SEGMENT}/${DISCOGS_INTEGRATION_ID}`
  const doc = await documentStore.getDocument<Record<string, unknown>>(path)
  if (!doc || typeof doc !== 'object') return null

  const status = doc.status
  if (status !== 'connected') return null

  const discogsUsername = typeof doc.discogsUsername === 'string' ? doc.discogsUsername : ''
  if (!discogsUsername) return null

  const env = doc.credentialEnvelope as IntegrationCredentialEnvelope | undefined
  const schemaVersion = env ? readCredentialEnvelopeSchemaVersion(env) : undefined
  if (!env || schemaVersion !== 1) return null

  const { consumerKey, consumerSecret } = getDiscogsOAuthConfig()
  if (!consumerKey || !consumerSecret) return null

  try {
    const creds = decryptJsonEnvelope<DiscogsOAuthCredentialPayload>(uid, env)
    if (!creds.oauthToken || !creds.oauthTokenSecret) return null
    return {
      mode: 'oauth',
      consumerKey,
      consumerSecret,
      discogsUsername,
      oauthToken: creds.oauthToken,
      oauthTokenSecret: creds.oauthTokenSecret,
    }
  } catch {
    return null
  }
}
