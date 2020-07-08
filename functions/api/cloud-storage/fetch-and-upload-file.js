const admin = require('firebase-admin')
const https = require('https')

const { CLOUD_STORAGE_IMAGES_BUCKET } = require('../../constants')
const toIGDestinationPath = require('../../transformers/to-ig-destination-path')

const fetchAndUploadFile = ({ mediaURL, id }) => {
  return new Promise((resolve, reject) => {
    const bucket = admin.storage().bucket(CLOUD_STORAGE_IMAGES_BUCKET)
    const destinationPath = toIGDestinationPath(mediaURL, id)

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

      resolve({
        id,
        fileName: destinationPath,
      })
    } catch (error) {
      reject(`Failed to fetch or upload file: ${destinationPath}`, error)
    }
  })
}

module.exports = fetchAndUploadFile
