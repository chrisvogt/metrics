import admin from 'firebase-admin'
import { Timestamp } from 'firebase/firestore'

const getInstagramWidgetContent = async userId => {
  const db = admin.firestore()
  const collectionName = `users/${userId}/instagram`
  const doc = await db.collection(collectionName).doc('widget-content').get()

  try {
    const data = doc.data()

    const {
      meta,
      media,
      profile: {
        biography = '',
        followersCount = 0,
        mediaCount = 0,
        username = '',
      } = {}
    } = data
  
    return {
      collections: {
        media,
      },
      meta: {
        synced: new Timestamp(meta.synced._seconds, meta.synced._nanoseconds).toDate()
      },
      metrics: [
        {
          displayName: 'Followers',
          id: 'followers-count',
          value: followersCount,
        },
        {
          displayName: 'Posts',
          id: 'media-count',
          value: mediaCount,
        },
      ],
      provider: {
        displayName: 'Instagram',
        id: 'instagram',
      },
      profile: {
        biography,
        displayName: username,
        profileURL: `https://www.instagram.com/${username}`,
      },
    }
  } catch {
    throw new Error('Failed to get a response.')
  }
}

export default getInstagramWidgetContent
