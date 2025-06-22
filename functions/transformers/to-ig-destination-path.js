import path from 'path'

import { CLOUD_STORAGE_INSTAGRAM_PATH } from '../constants.js'

const toIGDestinationPath = (mediaURL, id) => {
  const fileExtension = path.extname(new URL(mediaURL).pathname)
  const destinationPath = `${CLOUD_STORAGE_INSTAGRAM_PATH}${id}${fileExtension}`
  return destinationPath
}

export default toIGDestinationPath
