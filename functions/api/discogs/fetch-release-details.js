import { logger } from 'firebase-functions'

/**
 * Fetches detailed release resource data from Discogs API
 * @param {string} resourceUrl - The resource_url to fetch
 * @param {string} releaseId - The release ID for logging purposes
 * @returns {Promise<Object|null>} The detailed release resource data or null if failed
 */
const fetchReleaseDetails = async (resourceUrl, releaseId) => {
  const apiKey = process.env.DISCOGS_API_KEY

  if (!apiKey) {
    throw new Error('Missing required environment variable: DISCOGS_API_KEY')
  }

  try {
    // Add API key to URL if it's not already present
    const urlWithAuth = resourceUrl.includes('token=') 
      ? resourceUrl 
      : `${resourceUrl}${resourceUrl.includes('?') ? '&' : '?'}token=${apiKey}`

    logger.debug(`Fetching release resource for ${releaseId} from ${urlWithAuth}`)

    const response = await fetch(urlWithAuth, {
      headers: {
        'User-Agent': 'MetricsApp/1.0'
      }
    })

    if (!response.ok) {
      logger.warn(`Failed to fetch release resource for ${releaseId}: ${response.status} ${response.statusText}`)
      return null
    }

    const resourceData = await response.json()
    logger.debug(`Successfully fetched release resource for ${releaseId}`)
    
    return resourceData
  } catch (error) {
    logger.error(`Error fetching release resource for ${releaseId}:`, error)
    return null
  }
}

export default fetchReleaseDetails
