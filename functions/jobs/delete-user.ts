import admin from 'firebase-admin'
import { logger } from 'firebase-functions'

import { DATABASE_COLLECTION_USERS } from '../lib/constants.js'

interface UserRecord {
  uid: string
}

interface DeleteUserResult {
  result: 'SUCCESS' | 'FAILURE'
  error?: string
}

const deleteUser = async (userRecord: UserRecord): Promise<DeleteUserResult> => {
  const { uid } = userRecord

  const db = admin.firestore()

  try {
    await db
      .collection(DATABASE_COLLECTION_USERS)
      .doc(uid)
      .delete()

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
