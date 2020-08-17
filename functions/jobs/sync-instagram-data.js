const path = require('path')
const pMap = require('p-map')

const fetchAndUploadFile = require('../api/cloud-storage/fetch-and-upload-file')
const fetchInstagramData = require('../api/instagram/fetch-instagram-data')
const listInstagramMedia = require('../api/cloud-storage/list-instagram-media')
const toIGDestinationPath = require('../transformers/to-ig-destination-path')

const { CLOUD_STORAGE_IMAGES_BUCKET } = require('../constants')

/*

Sync Instagram Data

The goal of this job is to store recent media data and artwork from an Instagram
feed into GCP Storage and Firebase.

* concurrent

- [x] Fetch all Instagram posts.
- [x] Fetch all saved media.

* sync

- [ ] Store the raw Instagram response data.
- [ ] Store the transformed Instagram media.
  - [ ] Filter out all except IMAGE posts.
- [x] Download each media file.
  - [x] Only download NEW media files
- [x] Upload each media file
- [ ] -Delete all unrecognized files (format: `${id}.jpg`) from GCP.- (do this in another job)
- [ ] Store reponse data for the client.

* notes

Valid media URL path beginnings:

- https://video.cdninstagram.com
- https://scontent.cdninstagram.com

*/

const validMediaBaseURLs = [
  'https://video.cdninstagram.com',
  'https://scontent.cdninstagram.com',
]

const syncInstagramData = async () => {
  const {
    media: { data: rawMedia },
  } = await fetchInstagramData()

  const storedMediaFileNames = await listInstagramMedia()

  const mediaToDownload = rawMedia
    .slice(0, 2)
    .filter(({ id, media_url: mediaURL }) => {
      const isAlreadyDownloaded = storedMediaFileNames.includes(
        toIGDestinationPath(mediaURL, id)
      )
      const isValidMediaURL = validMediaBaseURLs.find((baseURL) =>
        mediaURL.startsWith(baseURL)
      )
      return !isAlreadyDownloaded && isValidMediaURL
    })
    .map(({ id, media_type: mediaType, media_url: mediaURL }) => ({
      id,
      mediaType,
      mediaURL,
    }))

  if (!mediaToDownload.length) {
    console.log('No new files identified to download.')
    return 'ok'
  }

  let result
  try {
    result = await pMap(mediaToDownload, fetchAndUploadFile, {
      concurrency: 10,
      stopOnError: false,
    })

    console.info('Finished uploading all files to storage.', result)
  } catch (error) {
    console.error('Something went wrong downloading media files', error)
  }

  return {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    totalUploadedCount: result.length,
    uploadedFiles: result.map(({ fileName }) => fileName),
  }
}

;async () => await syncInstagramData()

module.exports = syncInstagramData
