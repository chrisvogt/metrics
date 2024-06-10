const admin = require('firebase-admin')
const https = require('https')

const { CLOUD_STORAGE_IMAGES_BUCKET } = require('../../constants')

const fetchAndUploadFile = ({ destinationPath, mediaURL, id }) => {
  return new Promise((resolve, reject) => {
    if (!mediaURL) {
      return reject(`Missing media to download for ${id}.`)
    }

    const bucket = admin.storage().bucket(CLOUD_STORAGE_IMAGES_BUCKET)

    try {
      https.get(mediaURL, (res) => {
        const file = bucket.file(destinationPath)
        res.pipe(
          file.createWriteStream({
            resumable: false,
            public: true,
            metadata: {
              contentType: res.headers['content-type'],
            },
          })
        )
      })

      return resolve({
        id,
        fileName: destinationPath,
      })
    } catch (error) {
      return reject(`Failed to fetch or upload file: ${destinationPath}`, error)
    }
  })
}

module.exports = fetchAndUploadFile
