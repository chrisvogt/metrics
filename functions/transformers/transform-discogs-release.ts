import { toPublicMediaUrl } from '../services/media/media-service.js'
import type { DiscogsEnhancedRelease, DiscogsTransformedRelease } from '../types/discogs.js'
import toDiscogsDestinationPath from './to-discogs-destination-path.js'

const transformDiscogsRelease = (rawRelease: DiscogsEnhancedRelease): DiscogsTransformedRelease => {
  const {
    id,
    instance_id: instanceId,
    date_added: dateAdded,
    rating,
    basic_information: basicInfo,
    folder_id: folderId,
    notes,
    resource // Raw resource data from batch fetching
  } = rawRelease

  if (!basicInfo) {
    throw new Error(`Discogs release ${String(id)} missing basic_information`)
  }

  const {
    id: basicId,
    master_id: masterId,
    master_url: masterUrl,
    resource_url: resourceUrl,
    thumb,
    cover_image: coverImage,
    title,
    year,
    formats,
    labels,
    artists,
    genres,
    styles
  } = basicInfo

  // Generate CDN URLs for both thumb and cover images
  const cdnThumbUrl = thumb ? toPublicMediaUrl(toDiscogsDestinationPath(thumb, id, 'thumb')) : null
  const cdnCoverUrl = coverImage
    ? toPublicMediaUrl(toDiscogsDestinationPath(coverImage, id, 'cover'))
    : null

  // Include raw resource data if available (no transformations)
  const resourceData = resource || null

  return {
    id,
    instanceId,
    dateAdded,
    rating,
    folderId,
    notes,
    basicInformation: {
      id: basicId,
      masterId,
      masterUrl,
      resourceUrl,
      thumb,
      coverImage,
      cdnThumbUrl,
      cdnCoverUrl,
      title,
      year,
      formats,
      labels,
      artists,
      genres,
      styles
    },
    // Include raw resource data if available
    ...(resourceData && { resource: resourceData })
  }
}

export default transformDiscogsRelease 
