import admin from 'firebase-admin'
import { logger } from 'firebase-functions'

import { DATABASE_COLLECTION_USERS } from '../lib/constants.js'

const deleteUser = async (userRecord) => {
  const { uid } = userRecord

  const db = admin.firestore()

  try {
    await db
      .collection(DATABASE_COLLECTION_USERS)
      .doc(uid)
      .delete()

    logger.info('User deleted successfully from database.', {
      uid
    })

    return {
      result: 'SUCCESS'
    }
  } catch (error) {
    logger.error('Failed to delete user from database.', {
      uid,
      error: error.message
    })

    return {
      result: 'FAILURE',
      error: error.message
    }
  }
}

export default deleteUser
