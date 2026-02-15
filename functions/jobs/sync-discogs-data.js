import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import pMap from 'p-map'

import fetchAndUploadFile from '../api/cloud-storage/fetch-and-upload-file.js'
import fetchDiscogsReleases from '../api/discogs/fetch-releases.js'
import fetchReleasesBatch from '../api/discogs/fetch-releases-batch.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'
import toDiscogsDestinationPath from '../transformers/to-discogs-destination-path.js'
import transformDiscogsRelease from '../transformers/transform-discogs-release.js'

import { 
  CLOUD_STORAGE_IMAGES_BUCKET, 
  DATABASE_COLLECTION_DISCOGS,
  DISCOGS_USERNAME
} from '../lib/constants.js'

/*

Sync Discogs Data

The goal of this job is to store recent release data and artwork from a Discogs
collection into GCP Storage and Firebase.

* concurrent

- [x] Fetch all Discogs releases.
- [x] Fetch all saved media.

* sync

- [x] Store the raw Discogs response data.
- [x] Store the transformed Discogs releases.
- [x] Download each media file.
  - [x] Only download NEW media files
- [x] Upload each media file

*/

// Reducer to handle media filtering and transformation
const getMediaReducer = (storedMediaFileNames = []) => (acc, release) => {
  const { id, basic_information: basicInfo } = release
  const { thumb, cover_image: coverImage } = basicInfo

  // Process thumb image
  if (thumb) {
    const thumbDestinationPath = toDiscogsDestinationPath(thumb, id, 'thumb')
    const isThumbAlreadyDownloaded = storedMediaFileNames.includes(thumbDestinationPath)
    
    if (!isThumbAlreadyDownloaded) {
      acc.push({
        destinationPath: thumbDestinationPath,
        id: `${id}_thumb`,
        mediaURL: thumb
      })
    }
  }

  // Process cover image
  if (coverImage) {
    const coverDestinationPath = toDiscogsDestinationPath(coverImage, id, 'cover')
    const isCoverAlreadyDownloaded = storedMediaFileNames.includes(coverDestinationPath)
    
    if (!isCoverAlreadyDownloaded) {
      acc.push({
        destinationPath: coverDestinationPath,
        id: `${id}_cover`,
        mediaURL: coverImage
      })
    }
  }

  return acc
}

const syncDiscogsData = async () => {
  try {
    const discogsResponse = await fetchDiscogsReleases()

    const { releases, pagination } = discogsResponse

    logger.info(`Starting Discogs sync for ${releases.length} releases`)

    // Estimate completion time
    const estimatedTimeSeconds = Math.ceil(releases.length / 2) // With concurrency=2
    logger.info(`Estimated completion time: ~${estimatedTimeSeconds} seconds (with 1s delays)`)

    // Fetch detailed data for all releases in parallel
    const enhancedReleases = await fetchReleasesBatch(releases, {
      concurrency: 2, // Small concurrency to balance speed vs rate limits
      stopOnError: false,
      delayMs: 1000 // 1 second delay between requests to respect rate limits
    })

    const storedMediaFileNames = await listStoredMedia()

    const mediaReducer = getMediaReducer(storedMediaFileNames)
    const mediaToDownload = enhancedReleases.reduce(mediaReducer, [])

    const db = admin.firestore()

    // Calculate document size before saving to Firestore
    const documentToSave = {
      ...discogsResponse,
      releases: enhancedReleases, // Store enhanced releases
      fetchedAt: Timestamp.now(),
    }
    
    const documentSizeBytes = Buffer.byteLength(JSON.stringify(documentToSave), 'utf8')
    const documentSizeKB = Math.round(documentSizeBytes / 1024)
    const documentSizeMB = Math.round(documentSizeBytes / (1024 * 1024) * 100) / 100
    
    logger.info(`Document size before saving: ${documentSizeBytes} bytes (${documentSizeKB} KB, ${documentSizeMB} MB)`, {
      totalReleases: enhancedReleases.length,
      releasesWithResource: enhancedReleases.filter(r => r.resource).length,
      releasesWithoutResource: enhancedReleases.filter(r => !r.resource).length,
      firestoreLimit: 1048576, // 1MB in bytes
      exceedsLimit: documentSizeBytes > 1048576,
      sizeReduction: documentSizeBytes > 1048576 ? 'Filtered resource data to reduce size' : 'No filtering needed'
    })

    // Save the raw Discogs response data (with enhanced releases)
    await db
      .collection(DATABASE_COLLECTION_DISCOGS)
      .doc('last-response')
      .set(documentToSave)

    const transformedReleases = enhancedReleases.map(transformDiscogsRelease)

    const updatedWidgetContent = {
      collections: {
        releases: transformedReleases
      },
      metrics: {
        'LPs Owned': pagination.items
      },
      profile: {
        profileURL: `https://www.discogs.com/user/${DISCOGS_USERNAME}/collection`
      },
      meta: {
        synced: Timestamp.now(),
      }
    }

    // Save the widget content
    await db
      .collection(DATABASE_COLLECTION_DISCOGS)
      .doc('widget-content')
      .set(updatedWidgetContent)

    if (!mediaToDownload.length) {
      return {
        data: updatedWidgetContent,
        ok: true,
        result: 'SUCCESS',
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
      result = []
    }

    logger.info('Discogs sync finished successfully.', {
      destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
      totalUploadedCount: result.length,
      uploadedFiles: result.map(({ fileName }) => fileName),
    })

    return {
      destinationBucket: CLOUD_STORAGE_IMAGES_BUCKET,
      result: 'SUCCESS',
      totalUploadedCount: result.length,
      uploadedFiles: result.map(({ fileName }) => fileName),
      data: updatedWidgetContent,
    }
  } catch (error) {
    logger.error('Failed to sync Discogs data.', error)
    return {
      result: 'FAILURE',
      error: error.message || error,
    }
  }
}

export default syncDiscogsData 