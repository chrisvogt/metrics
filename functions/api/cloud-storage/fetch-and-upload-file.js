import admin from 'firebase-admin'
import https from 'https'
import { CLOUD_STORAGE_IMAGES_BUCKET } from '../../constants.js'

const fetchAndUploadFile = ({ destinationPath, mediaURL, id }) => {
  return new Promise((resolve, reject) => {
    if (!mediaURL) {
      return reject(`Missing media to download for ${id}.`)
    }

    const bucket = admin.storage().bucket(CLOUD_STORAGE_IMAGES_BUCKET)
    const file = bucket.file(destinationPath)

    https.get(mediaURL, (res) => {
      const contentType = res.headers['content-type'] || 'application/octet-stream'
      const writeStream = file.createWriteStream({
        resumable: false,
        public: true,
        metadata: { contentType },
      })

      res.pipe(writeStream)

      writeStream.on('finish', () => {
        resolve({
          id,
          fileName: destinationPath,
        })
      })

      writeStream.on('error', (err) => {
        reject(`Failed to upload ${destinationPath}: ${err.message}`)
      })
    }).on('error', (err) => {
      reject(`Failed to download media for ${id}: ${err.message}`)
    })
  })
}

export default fetchAndUploadFile
