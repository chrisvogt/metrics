import { logger } from 'firebase-functions'
import got from 'got'

import { getFlickrConfig } from '../../config/backend-config.js'
import type { FlickrPhoto, FlickrPhotosResponse } from '../../types/flickr.js'
import type { ResolvedFlickrApiAuth } from '../../services/flickr-integration-credentials.js'
import {
  flickrSignQuery,
  sortedQueryFromParams,
} from '../../services/flickr-oauth1a.js'

const FLICKR_API_BASE_URL = 'https://www.flickr.com/services/rest'

export interface FetchPhotosOptions {
  oauth?: ResolvedFlickrApiAuth
}

/**
 * Fetch recent photos from Flickr (unsigned API key or OAuth 1.0a).
 * @see {@link https://www.flickr.com/services/api/flickr.people.getPhotos.html}
 */
const fetchPhotos = async (options: FetchPhotosOptions = {}): Promise<FlickrPhotosResponse> => {
  const { oauth } = options

  if (oauth) {
    return fetchPhotosOAuth(oauth)
  }

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
        per_page: 12,
        extras: 'date_taken,description,owner_name,url_q,url_m,url_l',
        privacy_filter: 1,
      },
    })

    return normalizePhotosResponse(body, userId)
  } catch (error) {
    logger.error('Error fetching Flickr photos:', error)
    throw error
  }
}

async function fetchPhotosOAuth(auth: ResolvedFlickrApiAuth): Promise<FlickrPhotosResponse> {
  const { consumerKey, consumerSecret, userNsid, oauthToken, oauthTokenSecret } = auth
  const baseParams: Record<string, string> = {
    method: 'flickr.people.getPhotos',
    format: 'json',
    nojsoncallback: '1',
    user_id: userNsid,
    per_page: '12',
    extras: 'date_taken,description,owner_name,url_q,url_m,url_l',
    privacy_filter: '1',
    oauth_consumer_key: consumerKey,
    oauth_token: oauthToken,
  }

  const signed = flickrSignQuery(
    'GET',
    FLICKR_API_BASE_URL,
    baseParams,
    consumerSecret,
    oauthTokenSecret
  )
  const qs = sortedQueryFromParams(signed)

  try {
    const { body } = await got(`${FLICKR_API_BASE_URL}?${qs}`, {
      responseType: 'json',
    })
    return normalizePhotosResponse(body, userNsid)
  } catch (error) {
    logger.error('Error fetching Flickr photos (OAuth):', error)
    throw error
  }
}

function normalizePhotosResponse(
  body: unknown,
  canonicalUserId: string
): FlickrPhotosResponse {
  const res = body as {
    photos?: { photo?: Record<string, unknown>[]; total?: number; page?: number; pages?: number }
    stat?: string
    message?: string
  }
  if (res?.stat === 'fail') {
    throw new Error(`Flickr API error: ${res.message ?? 'unknown'}`)
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
      link: `https://www.flickr.com/photos/${canonicalUserId}/${photo.id}`,
    }
  })

  return {
    photos,
    total: res.photos.total,
    page: res.photos.page,
    pages: res.photos.pages,
  }
}

export default fetchPhotos
