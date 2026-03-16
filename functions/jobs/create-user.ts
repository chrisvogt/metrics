import type { DocumentStore } from '../ports/document-store.js'
import { getLogger } from '../services/logger.js'
import { toStoredDateTime } from '../utils/time.js'

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

const createUser = async (
  userRecord: UserRecord,
  documentStore: DocumentStore
): Promise<CreateUserResult> => {
  const logger = getLogger()
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
    createdAt: toStoredDateTime(),
    updatedAt: toStoredDateTime(),
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
