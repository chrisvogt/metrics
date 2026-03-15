import path from 'path'

import { toProviderMediaPrefix } from '../config/backend-paths.js'

const toIGDestinationPath = (mediaURL, id) => {
  const fileExtension = path.extname(new URL(mediaURL).pathname)
  const destinationPath = `${toProviderMediaPrefix('instagram')}${id}${fileExtension}`
  return destinationPath
}

export default toIGDestinationPath
