import { logger } from 'firebase-functions'
import { Timestamp } from 'firebase-admin/firestore'
import { FirestoreDocumentStore } from '../adapters/storage/firestore-document-store.js'
import type { DocumentStore } from '../ports/document-store.js'

import { DATABASE_COLLECTION_USERS } from '../config/constants.js'

interface UserRecord {
  uid: string
  email?: string
  displayName?: string
}

interface CreateUserResult {
  result: 'SUCCESS' | 'FAILURE'
  userData?: unknown
  error?: string
}

const defaultDocumentStore = new FirestoreDocumentStore()

const createUser = async (
  userRecord: UserRecord,
  documentStore: DocumentStore = defaultDocumentStore
): Promise<CreateUserResult> => {
  const { uid, email, displayName } = userRecord

  const userData = {
    uid,
    email,
    displayName: displayName || null,
    tokens: {},
    subscription: {
      active: true,
    },
    widgets: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }

  try {
    await documentStore.setDocument(`${DATABASE_COLLECTION_USERS}/${uid}`, userData)

    logger.info('User created successfully in database.', {
      uid,
      email,
      displayName,
    })

    return {
      result: 'SUCCESS',
      userData,
    }
  } catch (error) {
    const errorMessage = (error as { message?: string })?.message
    logger.error('Failed to create user in database.', {
      uid,
      email,
      error: errorMessage,
    })

    return {
      result: 'FAILURE',
      error: errorMessage,
    }
  }
}

export default createUser
