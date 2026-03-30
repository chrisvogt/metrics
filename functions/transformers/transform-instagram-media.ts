import { toPublicMediaUrl } from '../services/media/media-service.js'
import type {
  InstagramGraphChild,
  InstagramGraphMediaItem,
  InstagramTransformedMedia,
} from '../types/instagram.js'
import toIGDestinationPath from '../transformers/to-ig-destination-path.js'

const transformInstagramMedia = (
  rawMedia: InstagramGraphMediaItem,
): InstagramTransformedMedia => {
  const {
    alt_text: altText,
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
  const cdnMediaURL = toPublicMediaUrl(toIGDestinationPath(preferredMediaURL, id))

  // Recursively transform child media, if present
  const transformedChildren = children?.data?.map((child: InstagramGraphChild) => {
    const childMediaURL = child.thumbnail_url || child.media_url // Prefer thumbnail_url for children if available
    return {
      ...child,
      cdnMediaURL: toPublicMediaUrl(toIGDestinationPath(childMediaURL, child.id))
    }
  })

  return {
    altText,
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

export default transformInstagramMedia
