import { logger } from 'firebase-functions'
import { getDiscogsConfig } from '../../config/backend-config.js'
import { chronogroveHttpUserAgent } from '../../config/chronogrove-http-user-agent.js'
import type { DiscogsCollectionReleaseItem, DiscogsCollectionResponse } from '../../types/discogs.js'

const fetchDiscogsReleases = async (): Promise<DiscogsCollectionResponse> => {
  const { apiKey, username } = getDiscogsConfig()

  if (!apiKey || !username) {
    throw new Error('Missing required environment variables: DISCOGS_API_KEY or DISCOGS_USERNAME')
  }

  try {
    let allReleases: DiscogsCollectionReleaseItem[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?token=${apiKey}&page=${page}&per_page=50`
      
      logger.info(`Fetching Discogs releases page ${page}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': chronogroveHttpUserAgent
        }
      })

      if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as {
        releases: DiscogsCollectionReleaseItem[]
        pagination: { page: number; pages: number }
      }
      
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
