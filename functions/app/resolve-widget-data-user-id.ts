import type { Request } from 'express'
import type { DocumentStore } from '../ports/document-store.js'
import { getUsersCollectionPath } from '../config/backend-paths.js'
import { TENANT_USERNAMES_COLLECTION } from '../config/future-tenant-collections.js'
import { ONBOARDING_USERNAME_PATTERN } from './onboarding-progress.js'

/** Query-string Firebase Auth uid: alphanumeric, underscore, hyphen; 1–128 chars. */
const FIREBASE_UID_QUERY_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/

export function firstQueryString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string' && first.trim()) {
      return first.trim()
    }
  }
  return undefined
}

/**
 * Optional `uid` or `username` on public widget reads. `uid` wins when both are present.
 * Returns `skip` to fall back to hostname-based resolution.
 */
export async function resolveWidgetDataUserIdFromPublicQuery(
  req: Request,
  documentStore: DocumentStore
): Promise<'skip' | { userId: string } | 'not_found'> {
  const query = req.query && typeof req.query === 'object' ? req.query : {}
  const uidParam = firstQueryString(query.uid)
  const usernameParam = firstQueryString(query.username)

  if (uidParam !== undefined) {
    if (!FIREBASE_UID_QUERY_PATTERN.test(uidParam)) {
      return 'not_found'
    }
    return { userId: uidParam }
  }

  if (usernameParam !== undefined) {
    const lowered = usernameParam.toLowerCase()
    if (!ONBOARDING_USERNAME_PATTERN.test(lowered)) {
      return 'not_found'
    }
    const claimPath = `${TENANT_USERNAMES_COLLECTION}/${lowered}`
    const claim = await documentStore.getDocument<{ uid?: unknown }>(claimPath)
    if (claim && typeof claim.uid === 'string' && claim.uid.length > 0) {
      return { userId: claim.uid }
    }
    if (documentStore.legacyUsernameOwnerUid) {
      const owner = await documentStore.legacyUsernameOwnerUid(getUsersCollectionPath(), lowered)
      if (owner) {
        return { userId: owner }
      }
    }
    return 'not_found'
  }

  return 'skip'
}
