const { IMAGE_CDN_BASE_URL } = require('../constants')
const toIGDestinationPath = require('../transformers/to-ig-destination-path')

const transformInstagramMedia = rawMedia => {
  const {
    caption,
    comments_count: commentsCounts,
    children,
    id,
    like_count: likeCount,
    media_type: mediaType,
    media_url: mediaURL,
    permalink,
    shortcode,
    thumbnail_url: thumbnailURL,
    timestamp,
    username,
  } = rawMedia

  // Determine the media URL to use for the CDN (prefer thumbnailURL for videos)
  const preferredMediaURL = mediaType === 'VIDEO' ? thumbnailURL : mediaURL
  const cdnMediaURL = `${IMAGE_CDN_BASE_URL}${toIGDestinationPath(preferredMediaURL, id)}`

  // Recursively transform child media, if present
  const transformedChildren = children?.data?.map(child => {
    const childMediaURL = child.thumbnail_url || child.media_url // Prefer thumbnail_url for children if available
    return {
      ...child,
      cdnMediaURL: `${IMAGE_CDN_BASE_URL}${toIGDestinationPath(childMediaURL, child.id)}`
    }
  })

  return {
    caption,
    cdnMediaURL,
    children: transformedChildren, // Include transformed children
    commentsCounts,
    id,
    likeCount,
    mediaType,
    mediaURL,
    permalink,
    shortcode,
    thumbnailURL,
    timestamp,
    username,
  }
}

module.exports = transformInstagramMedia
