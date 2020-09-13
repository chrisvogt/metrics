const admin = require('firebase-admin')
const pMap = require('p-map')

const fetchAndUploadFile = require('../api/cloud-storage/fetch-and-upload-file')
const fetchInstagramData = require('../api/instagram/fetch-instagram-data')
const listInstagramMedia = require('../api/cloud-storage/list-instagram-media')
const toIGDestinationPath = require('../transformers/to-ig-destination-path')
const transformInstagramMedia = require('../transformers/transform-instagram-media')

const { CLOUD_STORAGE_IMAGES_BUCKET } = require('../constants')

/*

Sync Instagram Data

The goal of this job is to store recent media data and artwork from an Instagram
feed into GCP Storage and Firebase.

* concurrent

- [x] Fetch all Instagram posts.
- [x] Fetch all saved media.

* sync

- [x] Store the raw Instagram response data.
- [ ] Store the transformed Instagram media.
  - [x] Filter out all except IMAGE and CAROUSEL posts.
- [x] Download each media file.
  - [x] Only download NEW media files
- [x] Upload each media file
- [ ] -Delete all unrecognized files (format: `${id}.jpg`) from GCP.- (do this in another job)

* notes

Valid media URL path beginnings:

- https://video.cdninstagram.com
- https://scontent.cdninstagram.com

*/

const validMediaTypes = ['CAROUSEL_ALBUM', 'IMAGE']

const syncInstagramData = async () => {
  const instagramResponse = await fetchInstagramData()

  const {
    media: { data: rawMedia },
  } = instagramResponse

  const storedMediaFileNames = await listInstagramMedia()

  // TODO: update the filters to use the same source of truth as data being saved
  // to the db.
  const mediaToDownload = rawMedia
    .filter(({ id, media_type: mediaType, media_url: mediaURL }) => {
      const isAlreadyDownloaded = storedMediaFileNames.includes(
        toIGDestinationPath(mediaURL, id)
      )

      const isValidMediaType = validMediaTypes.includes(mediaType)

      return isValidMediaType && !isAlreadyDownloaded
    })
    .map(({ id, media_url: mediaURL }) => ({
      id,
      mediaURL,
    }))

  const db = admin.firestore()

  // Save the raw Instagram response data
  await db
    .collection('instagram')
    .doc('last-response')
    .set({
      ...instagramResponse,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

  const filteredMedia = rawMedia.filter(({ media_type: mediaType }) =>
    validMediaTypes.includes(mediaType)
  )

  await db
    .collection('instagram')
    .doc('widget-content')
    .set({
      media: filteredMedia.map(transformInstagramMedia),
      meta: {
        synced: admin.firestore.FieldValue.serverTimestamp(),
      },
      profile: {
        username: instagramResponse.username,
        mediaCount: instagramResponse.media_count
      },
    })

  if (!mediaToDownload.length) {
    return {
      ok: true,
      totalUploadedCount: 0,
    }
  }

  let result
  try {
    result = await pMap(mediaToDownload, fetchAndUploadFile, {
      concurrency: 10,
      stopOnError: false,
    })

    console.info('Successfully uploaded all files to storage.')
  } catch (error) {
    console.error('Something went wrong downloading media files', error)
  }

  return {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    result: 'SUCCESS',
    totalUploadedCount: result.length,
    uploadedFiles: result.map(({ fileName }) => fileName),
  }
}

;async () => await syncInstagramData()

module.exports = syncInstagramData
