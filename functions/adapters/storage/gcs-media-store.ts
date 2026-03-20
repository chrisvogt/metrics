import admin from 'firebase-admin'
import https from 'https'

import { getStorageConfig } from '../../config/backend-config.js'
import type { MediaDescriptor, MediaStore, StoredMedia } from '../../ports/media-store.js'

function getBucketName(): string {
  const bucket = getStorageConfig().cloudStorageImagesBucket
  if (!bucket) {
    throw new Error(
      'Bucket name not specified or invalid. Set storage.cloud_storage_images_bucket in FUNCTIONS_CONFIG_EXPORT secret.'
    )
  }
  return bucket
}

export class GcsMediaStore implements MediaStore {
  async listFiles(): Promise<string[]> {
    const bucket = admin.storage().bucket(getBucketName())
    const [files] = await bucket.getFiles()

    return files.map(({ name }) => name)
  }

  fetchAndStore({ destinationPath, mediaURL, id }: MediaDescriptor): Promise<StoredMedia> {
    return new Promise((resolve, reject) => {
      if (!mediaURL) {
        reject(new Error(`Missing media to download for ${id}.`))
        return
      }

      const bucket = admin.storage().bucket(getBucketName())
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
          reject(new Error(`Failed to upload ${destinationPath}: ${err.message}`))
        })
      }).on('error', (err) => {
        reject(new Error(`Failed to download media for ${id}: ${err.message}`))
      })
    })
  }

  describe() {
    return {
      backend: 'gcs',
      target: getStorageConfig().cloudStorageImagesBucket ?? 'unknown-bucket',
    }
  }
}
