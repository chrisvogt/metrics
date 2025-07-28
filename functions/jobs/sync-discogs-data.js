import admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import pMap from 'p-map'

import fetchAndUploadFile from '../api/cloud-storage/fetch-and-upload-file.js'
import fetchDiscogsReleases from '../api/discogs/fetch-releases.js'
import listStoredMedia from '../api/cloud-storage/list-stored-media.js'
import toDiscogsDestinationPath from '../transformers/to-discogs-destination-path.js'
import transformDiscogsRelease from '../transformers/transform-discogs-release.js'

import { 
  CLOUD_STORAGE_IMAGES_BUCKET, 
  DATABASE_COLLECTION_DISCOGS 
} from '../constants.js'

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

    const storedMediaFileNames = await listStoredMedia()

    const mediaReducer = getMediaReducer(storedMediaFileNames)
    const mediaToDownload = releases.reduce(mediaReducer, [])

    const db = admin.firestore()

    // Save the raw Discogs response data
    await db
      .collection(DATABASE_COLLECTION_DISCOGS)
      .doc('last-response')
      .set({
        ...discogsResponse,
        fetchedAt: Timestamp.now(),
      })

    const transformedReleases = releases.map(transformDiscogsRelease)

    const updatedWidgetContent = {
      collections: {
        releases: transformedReleases
      },
      metrics: {
        'LPs Owned': pagination.items
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

async () => await syncDiscogsData()

export default syncDiscogsData 