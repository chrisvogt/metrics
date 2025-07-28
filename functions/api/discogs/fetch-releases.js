import { logger } from 'firebase-functions'
import { DISCOGS_USERNAME } from '../../constants.js'

const fetchDiscogsReleases = async () => {
  try {
    const apiKey = process.env.DISCOGS_API_KEY
    const username = DISCOGS_USERNAME

    if (!apiKey || !username) {
      throw new Error('Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME')
    }

    let allReleases = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?token=${apiKey}&page=${page}&per_page=50`
      
      logger.info(`Fetching Discogs releases page ${page}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MetricsApp/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      allReleases = allReleases.concat(data.releases)
      
      // Check if there are more pages
      hasMore = data.pagination.page < data.pagination.pages
      page++
    }

    // Return data in the same format as the original response but with all releases
    return {
      pagination: {
        page: 1,
        pages: 1,
        per_page: allReleases.length,
        items: allReleases.length,
        urls: {}
      },
      releases: allReleases
    }
  } catch (error) {
    logger.error('Failed to fetch Discogs releases', error)
    throw error
  }
}

export default fetchDiscogsReleases 