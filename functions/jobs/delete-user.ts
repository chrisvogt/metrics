import { logger } from 'firebase-functions'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'

import { DATABASE_COLLECTION_USERS } from '../config/constants.js'

interface UserRecord {
  uid: string
}

interface DeleteUserResult {
  result: 'SUCCESS' | 'FAILURE'
  error?: string
}

const defaultDocumentStore = new FirestoreDocumentStore()

const deleteUser = async (
  userRecord: UserRecord,
  documentStore: DocumentStore = defaultDocumentStore
): Promise<DeleteUserResult> => {
  const { uid } = userRecord

  try {
    if (!documentStore.deleteDocument) {
      throw new Error('Configured DocumentStore does not support deletes')
    }

    await documentStore.deleteDocument(`${DATABASE_COLLECTION_USERS}/${uid}`)

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
