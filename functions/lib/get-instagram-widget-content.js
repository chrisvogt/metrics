const admin = require('firebase-admin')
const { Timestamp } = require ('firebase/firestore')

const getInstagramWidgetContent = async () => {
  const db = admin.firestore()
  const doc = await db.collection('instagram').doc('widget-content').get()

  try {
    const {
      meta,
      media,
      profile: {
        mediaCount = -1,
        username
      } = {}
    } = doc.data()
  
    return {
      collections: {
        media,
      },
      meta: {
        synced: new Timestamp(meta.synced._seconds, meta.synced._nanoseconds).toDate()
      },
      metrics: [
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
        displayName: username,
        profileURL: `https://www.instagram.com/${username}`,
      },
    }
  } catch (error) {
    throw new Error('Failed to get a response.')
  }
}

module.exports = getInstagramWidgetContent
