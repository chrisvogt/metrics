import admin from 'firebase-admin'

import { CLOUD_STORAGE_IMAGES_BUCKET } from '../../lib/constants.js'

// TODO: RegEx every name to identify the media ID and return a list.

/* List Instagram media in the Cloud Storage bucket. */
const listStoredMedia = async () => {
  const bucket = admin.storage().bucket(CLOUD_STORAGE_IMAGES_BUCKET)
  const [files] = await bucket.getFiles()

  const fileNames = files.map(({ name }) => name)

  return fileNames
}

export default listStoredMedia
