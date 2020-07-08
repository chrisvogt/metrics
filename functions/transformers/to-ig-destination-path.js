const path = require('path')

const { CLOUD_STORAGE_INSTAGRAM_PATH } = require('../constants')

const toIGDestinationPath = (mediaURL, id) => {
  const fileExtension = path.extname(new URL(mediaURL).pathname)
  const destinationPath = `${CLOUD_STORAGE_INSTAGRAM_PATH}${id}${fileExtension}`
  return destinationPath
}

module.exports = toIGDestinationPath
