const admin = require('firebase-admin')
const { Timestamp } = require('firebase-admin/firestore')
const { logger } = require('firebase-functions')
const pMap = require('p-map')

const fetchAndUploadFile = require('../api/cloud-storage/fetch-and-upload-file')
const fetchInstagramData = require('../api/instagram/fetch-instagram-data')
const listStoredMedia = require('../api/cloud-storage/list-stored-media')
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

const validMediaTypes = ['CAROUSEL_ALBUM', 'IMAGE', 'VIDEO']

// Reducer to handle media filtering and transformation
const getMediaReducer = (storedMediaFileNames = []) => (acc, mediaItem) => {
  const { id, media_type: mediaType, media_url: mediaURL, thumbnail_url: thumbnailURL, children } = mediaItem
  const destinationPath = toIGDestinationPath(thumbnailURL || mediaURL, id) // Prefer thumbnailURL if available
  const isAlreadyDownloaded = storedMediaFileNames.includes(destinationPath)
  const isValidMediaType = validMediaTypes.includes(mediaType)

  if (isValidMediaType && !isAlreadyDownloaded) {
    // Push the main media item
    acc.push({
      destinationPath,
      id,
      mediaURL: thumbnailURL || mediaURL // Save thumbnailURL if available
    })
  }

  // If the media item has children, process them recursively
  if (mediaType === 'CAROUSEL_ALBUM' && children?.data) {
    const childMedia = children.data.map(child => ({
      id: child.id,
      mediaURL: child.thumbnail_url || child.media_url, // Prefer thumbnailURL for child items
      destinationPath: toIGDestinationPath(child.thumbnail_url || child.media_url, child.id)
    }))
    // Filter children for already downloaded media
    childMedia
      .filter(({ destinationPath }) => !storedMediaFileNames.includes(destinationPath))
      .forEach(validChild => acc.push(validChild))
  }

  return acc
}

const syncInstagramData = async () => {
  const instagramResponse = await fetchInstagramData()

  const {
    media: { data: rawMedia },
  } = instagramResponse

  const storedMediaFileNames = await listStoredMedia()

  const mediaReducer = getMediaReducer(storedMediaFileNames)
  const mediaToDownload = rawMedia.reduce(mediaReducer, [])

  const db = admin.firestore()

  // Save the raw Instagram response data
  await db
    .collection('instagram')
    .doc('last-response')
    .set({
      ...instagramResponse,
      fetchedAt: Timestamp.now(),
    })

  const filteredMedia = rawMedia.filter(({ media_type: mediaType }) =>
    validMediaTypes.includes(mediaType)
  )

  // Save the widget content
  await db
    .collection('instagram')
    .doc('widget-content')
    .set({
      media: filteredMedia.map(transformInstagramMedia),
      meta: {
        synced: Timestamp.now(),
      },
      profile: {
        username: instagramResponse.username,
        mediaCount: instagramResponse.media_count,
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
  } catch (error) {
    logger.error('Something went wrong downloading media files', error)
  }

  logger.info('Instagram sync finished successfully.', {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    totalUploadedCount: result.length,
    uploadedFiles: result.map(({ fileName }) => fileName),
  })

  return {
    destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
    result: 'SUCCESS',
    totalUploadedCount: result.length,
    uploadedFiles: result.map(({ fileName }) => fileName),
  }
}

async () => await syncInstagramData()

module.exports = syncInstagramData
