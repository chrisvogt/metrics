import admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { DATABASE_COLLECTION_USERS } from '../lib/constants.js';
const createUser = async (userRecord) => {
    const { uid, email, displayName } = userRecord;
    const db = admin.firestore();
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
    };
    try {
        await db
            .collection(DATABASE_COLLECTION_USERS)
            .doc(uid)
            .set(userData);
        logger.info('User created successfully in database.', {
            uid,
            email,
            displayName,
        });
        return {
            result: 'SUCCESS',
            userData,
        };
    }
    catch (error) {
        const errorMessage = error?.message;
        logger.error('Failed to create user in database.', {
            uid,
            email,
            error: errorMessage,
        });
        return {
            result: 'FAILURE',
            error: errorMessage,
        };
    }
};
export default createUser;
//# sourceMappingURL=create-user.js.map