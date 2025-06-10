const { config, logger } = require('firebase-functions')
const got = require('got')

const FLICKR_API_BASE_URL = 'https://www.flickr.com/services/rest'

/**
 * Fetch recent photos from Flickr
 * @see {@link https://www.flickr.com/services/api/flickr.people.getPhotos.html}
 */
const fetchPhotos = async () => {
  const { flickr: { api_key: apiKey, user_id: userId } = {} } = config()

  if (!apiKey || !userId) {
    throw new Error('Missing required Flickr configuration (api_key or user_id)')
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

    if (!body || !body.photos || !body.photos.photo) {
      throw new Error('Invalid response from Flickr API')
    }

    return {
      photos: body.photos.photo.map(photo => ({
        id: photo.id,
        title: photo.title,
        description: photo.description?._content || '',
        dateTaken: photo.datetaken,
        ownerName: photo.ownername,
        thumbnailUrl: photo.url_q, // Square thumbnail (150x150)
        mediumUrl: photo.url_m,    // Medium size
        largeUrl: photo.url_l,     // Large size
        link: `https://www.flickr.com/photos/${userId}/${photo.id}`
      })),
      total: body.photos.total,
      page: body.photos.page,
      pages: body.photos.pages
    }
  } catch (error) {
    logger.error('Error fetching Flickr photos:', error)
    throw error
  }
}

module.exports = fetchPhotos 