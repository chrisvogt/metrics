import type { DocumentStore } from '../ports/document-store.js'
import { getLogger } from '../services/logger.js'
import { DATABASE_COLLECTION_USERS } from '../config/constants.js'
import {
  TENANT_HOSTS_COLLECTION,
  TENANT_USERNAMES_COLLECTION,
} from '../config/future-tenant-collections.js'
import { readStoredTenantHostnameFromUserDoc } from '../utils/read-stored-tenant-hostname.js'

interface UserRecord {
  uid: string
}

interface DeleteUserResult {
  result: 'SUCCESS' | 'FAILURE'
  error?: string
}

const deleteUser = async (
  userRecord: UserRecord,
  documentStore: DocumentStore
): Promise<DeleteUserResult> => {
  const logger = getLogger()
  const { uid } = userRecord

  try {
    if (!documentStore.deleteDocument || !documentStore.recursiveDeleteDocument) {
      throw new Error('Configured DocumentStore does not support deletes')
    }

    const userDocPath = `${DATABASE_COLLECTION_USERS}/${uid}`
    let profile: Record<string, unknown> | null = null
    try {
      profile = await documentStore.getDocument<Record<string, unknown>>(userDocPath)
    } catch {
      profile = null
    }

    const slug =
      profile &&
      typeof profile.username === 'string' &&
      profile.username.length > 0
        ? profile.username.toLowerCase()
        : null

    if (slug) {
      try {
        await documentStore.deleteDocument(`${TENANT_USERNAMES_COLLECTION}/${slug}`)
      } catch (claimErr) {
        logger.warn('Failed to delete tenant username claim during user delete', {
          uid,
          slug,
          error: (claimErr as { message?: string })?.message,
        })
      }
    }

    const hostname =
      profile == null ? null : readStoredTenantHostnameFromUserDoc(profile)
    if (hostname) {
      try {
        const hostClaim = await documentStore.getDocument<Record<string, unknown>>(
          `${TENANT_HOSTS_COLLECTION}/${hostname}`
        )
        if (hostClaim && hostClaim.uid === uid) {
          await documentStore.deleteDocument(`${TENANT_HOSTS_COLLECTION}/${hostname}`)
        }
      } catch (hostErr) {
        logger.warn('Failed to delete tenant hostname claim during user delete', {
          uid,
          hostname,
          error: (hostErr as { message?: string })?.message,
        })
      }
    }

    await documentStore.recursiveDeleteDocument(userDocPath)

    logger.info('User deleted successfully from database.', { uid })

    return { result: 'SUCCESS' }
  } catch (error) {
    const errorMessage = (error as { message?: string })?.message
    logger.error('Failed to delete user from database.', {
      uid,
      error: errorMessage,
    })

    return {
      result: 'FAILURE',
      error: errorMessage,
    }
  }
}

export default deleteUser
