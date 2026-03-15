import path from 'path'

import { toProviderMediaPrefix } from '../config/backend-paths.js'

const toDiscogsDestinationPath = (imageURL, releaseId, imageType = 'thumb') => {
  const fileExtension = path.extname(new URL(imageURL).pathname)
  const destinationPath = `${toProviderMediaPrefix('discogs')}${releaseId}_${imageType}${fileExtension}`
  return destinationPath
}

export default toDiscogsDestinationPath 
