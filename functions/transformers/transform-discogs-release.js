import { IMAGE_CDN_BASE_URL } from '../constants.js'
import toDiscogsDestinationPath from './to-discogs-destination-path.js'

const transformDiscogsRelease = rawRelease => {
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
  const cdnThumbUrl = thumb ? `${IMAGE_CDN_BASE_URL}${toDiscogsDestinationPath(thumb, id, 'thumb')}` : null
  const cdnCoverUrl = coverImage ? `${IMAGE_CDN_BASE_URL}${toDiscogsDestinationPath(coverImage, id, 'cover')}` : null

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