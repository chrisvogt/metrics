import { logger } from 'firebase-functions'
import got from 'got'

import { getFlickrConfig } from '../../config/backend-config.js'
import type { FlickrPhoto, FlickrPhotosResponse } from '../../types/flickr.js'

const FLICKR_API_BASE_URL = 'https://www.flickr.com/services/rest'

/**
 * Fetch recent photos from Flickr
 * @see {@link https://www.flickr.com/services/api/flickr.people.getPhotos.html}
 */
const fetchPhotos = async (): Promise<FlickrPhotosResponse> => {
  const { apiKey, userId } = getFlickrConfig()

  if (!apiKey || !userId) {
    throw new Error('Missing required Flickr configuration (FLICKR_API_KEY or FLICKR_USER_ID)')
  }

  try {
    const { body } = await got(FLICKR_API_BASE_URL, {
      responseType: 'json',
      searchParams: {
        method: 'flickr.people.getPhotos',
        api_key: apiKey,
        user_id: userId,
        format: 'json',
        nojsoncallback: 1,
        per_page: 12, // Fetch last 12 photos
        extras: 'date_taken,description,owner_name,url_q,url_m,url_l', // Include additional photo metadata
        privacy_filter: 1 // Only public photos
      }
    })

    const res = body as {
      photos?: { photo?: Record<string, unknown>[]; total?: number; page?: number; pages?: number }
    }
    if (!res?.photos?.photo) {
      throw new Error('Invalid response from Flickr API')
    }

    const photos: FlickrPhoto[] = res.photos.photo.map((photo) => {
      const desc = photo.description as { _content?: string } | undefined
      return {
        id: photo.id != null ? String(photo.id) : undefined,
        title: photo.title != null ? String(photo.title) : undefined,
        description: desc?._content ?? '',
        dateTaken: photo.datetaken != null ? String(photo.datetaken) : undefined,
        ownerName: photo.ownername != null ? String(photo.ownername) : undefined,
        thumbnailUrl: photo.url_q != null ? String(photo.url_q) : undefined,
        mediumUrl: photo.url_m != null ? String(photo.url_m) : undefined,
        largeUrl: photo.url_l != null ? String(photo.url_l) : undefined,
        link: `https://www.flickr.com/photos/${userId}/${photo.id}`,
      }
    })

    return {
      photos,
      total: res.photos.total,
      page: res.photos.page,
      pages: res.photos.pages
    }
  } catch (error) {
    logger.error('Error fetching Flickr photos:', error)
    throw error
  }
}

export default fetchPhotos 
