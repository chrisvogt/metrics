const { IMAGE_CDN_BASE_URL } = require('../constants')
const toIGDestinationPath = require('../transformers/to-ig-destination-path')

const transformInstagramMedia = rawMedia => {
  const {
    caption,
    id,
    media_type: mediaType,
    // NOTE(cvogt): I am intentionally stripping this out from the response object
    // to prevent unauthorized access.
    media_url: mediaURL,
    permalink,
    timestamp,
    username,
  } = rawMedia
  return ({
    caption,
    cdnMediaURL: `${IMAGE_CDN_BASE_URL}${toIGDestinationPath(mediaURL, id)}?auto=format`,
    id,
    mediaType,
    permalink,
    timestamp,
    username,
  })
}

module.exports = transformInstagramMedia
