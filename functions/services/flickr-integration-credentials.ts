import type { DocumentStore } from '../ports/document-store.js'
import { getFlickrOAuthConfig } from '../config/backend-config.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import {
  decryptJsonEnvelope,
  readCredentialEnvelopeSchemaVersion,
  type IntegrationCredentialEnvelope,
} from './integration-token-crypto.js'

export const FLICKR_INTEGRATION_ID = 'flickr'

export interface FlickrOAuthCredentialPayload {
  oauthToken: string
  oauthTokenSecret: string
}

export interface ResolvedFlickrApiAuth {
  mode: 'oauth'
  consumerKey: string
  consumerSecret: string
  userNsid: string
  oauthToken: string
  oauthTokenSecret: string
  /** Flickr username for profile display when OAuth had one. */
  flickrUsername?: string
}

export async function loadFlickrAuthForUser(
  documentStore: DocumentStore,
  uid: string
): Promise<ResolvedFlickrApiAuth | null> {
  const path = `${getUsersCollectionPath()}/${uid}/integrations/${FLICKR_INTEGRATION_ID}`
  const doc = await documentStore.getDocument<Record<string, unknown>>(path)
  if (!doc || typeof doc !== 'object') return null

  const status = doc.status
  if (status !== 'connected') return null

  const userNsid = typeof doc.flickrUserNsid === 'string' ? doc.flickrUserNsid : ''
  if (!userNsid) return null

  const env = doc.credentialEnvelope as IntegrationCredentialEnvelope | undefined
  const schemaVersion = env ? readCredentialEnvelopeSchemaVersion(env) : undefined
  if (!env || schemaVersion !== 1) return null

  const { consumerKey, consumerSecret } = getFlickrOAuthConfig()
  if (!consumerKey || !consumerSecret) return null

  try {
    const creds = decryptJsonEnvelope<FlickrOAuthCredentialPayload>(uid, env)
    if (!creds.oauthToken || !creds.oauthTokenSecret) return null
    return {
      mode: 'oauth',
      consumerKey,
      consumerSecret,
      userNsid,
      oauthToken: creds.oauthToken,
      oauthTokenSecret: creds.oauthTokenSecret,
      flickrUsername: typeof doc.flickrUsername === 'string' ? doc.flickrUsername : undefined,
    }
  } catch {
    return null
  }
}
