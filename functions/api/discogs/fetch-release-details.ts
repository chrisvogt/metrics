import { logger } from 'firebase-functions'

/**
 * Fetches detailed release resource data from Discogs API with retry logic
 * @param {string} resourceUrl - The resource_url to fetch
 * @param {string} releaseId - The release ID for logging purposes
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Object|null>} The detailed release resource data or null if failed
 */
const fetchReleaseDetails = async (resourceUrl, releaseId, maxRetries = 3) => {
  const apiKey = process.env.DISCOGS_API_KEY

  if (!apiKey) {
    throw new Error('Missing required environment variable: DISCOGS_API_KEY')
  }

  // Add API key to URL if it's not already present
  const urlWithAuth = resourceUrl.includes('token=') 
    ? resourceUrl 
    : `${resourceUrl}${resourceUrl.includes('?') ? '&' : '?'}token=${apiKey}`

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Fetching release resource for ${releaseId} (attempt ${attempt}/${maxRetries}) from ${urlWithAuth}`)

      const response = await fetch(urlWithAuth, {
        headers: {
          'User-Agent': 'MetricsApp/1.0'
        }
      })

      if (response.status === 429) {
        // Rate limited - wait longer before retrying
        const waitTime = Math.pow(2, attempt) * 3000 // Exponential backoff: 6s, 12s, 24s
        logger.warn(`Rate limited for release ${releaseId}, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        } else {
          logger.error(`Max retries reached for release ${releaseId} due to rate limiting`)
          return null
        }
      }

      if (!response.ok) {
        logger.warn(`Failed to fetch release resource for ${releaseId}: ${response.status} ${response.statusText}`)
        return null
      }

      const resourceData = await response.json()
      logger.debug(`Successfully fetched release resource for ${releaseId}`)
      
      return resourceData
    } catch (error) {
      logger.error(`Error fetching release resource for ${releaseId} (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt === maxRetries) {
        return null
      }
      
      // Wait before retrying on network errors
      const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  return null
}

export default fetchReleaseDetails
