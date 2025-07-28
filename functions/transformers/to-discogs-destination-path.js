import path from 'path'

import { CLOUD_STORAGE_DISCOGS_PATH } from '../constants.js'

const toDiscogsDestinationPath = (imageURL, releaseId, imageType = 'thumb') => {
  const fileExtension = path.extname(new URL(imageURL).pathname)
  const destinationPath = `${CLOUD_STORAGE_DISCOGS_PATH}${releaseId}_${imageType}${fileExtension}`
  return destinationPath
}

export default toDiscogsDestinationPath 