const admin = require('firebase-admin')

const { CLOUD_STORAGE_IMAGES_BUCKET } = require('../../constants')

// TODO: RegEx every name to identify the media ID and return a list.

/* List Instagram media in the Cloud Storage bucket. */
const listInstagramMedia = async () => {
  const bucket = admin.storage().bucket(CLOUD_STORAGE_IMAGES_BUCKET)
  const [files] = await bucket.getFiles()

  const fileNames = files.map(({ name }) => name)

  return fileNames
}

module.exports = listInstagramMedia
