import { logger } from 'firebase-functions'
import pMap from 'p-map'
import fetchReleaseDetails from './fetch-release-details.js'
import filterDiscogsResource from '../../transformers/filter-discogs-resource.js'

/**
 * Fetches detailed release resource data for all releases in a batch
 * @param {Array} releases - Array of release objects from Discogs collection API
 * @param {Object} options - Configuration options
 * @param {number} options.concurrency - Number of concurrent requests (default: 5)
 * @param {boolean} options.stopOnError - Whether to stop on first error (default: false)
 * @param {number} options.delayMs - Delay between requests in milliseconds (default: 100)
 * @returns {Promise<Array>} Array of enhanced releases with resource data
 */
const fetchReleasesBatch = async (releases, options = {}) => {
  const { concurrency = 5, stopOnError = false, delayMs = 100 } = options

  logger.info(`Starting batch fetch for ${releases.length} releases with concurrency ${concurrency}`)

  // Create array of fetch tasks - only use resource_url
  const fetchTasks = releases.map((release, index) => ({
    release,
    index,
    resourceUrl: release.basic_information?.resource_url,
    releaseId: release.id || release.basic_information?.id
  }))

  // Log releases without resource_url for monitoring
  const releasesWithoutResourceUrl = fetchTasks.filter(task => !task.resourceUrl)
  if (releasesWithoutResourceUrl.length > 0) {
    logger.warn(`Found ${releasesWithoutResourceUrl.length} releases without resource_url`, {
      releaseIds: releasesWithoutResourceUrl.map(task => task.releaseId),
      releases: releasesWithoutResourceUrl.map(task => ({
        id: task.releaseId,
        title: task.release.basic_information?.title,
        masterId: task.release.basic_information?.master_id,
        masterUrl: task.release.basic_information?.master_url
      }))
    })
  }

  // Filter to only include releases that have a resource_url
  const validFetchTasks = fetchTasks.filter(task => task.resourceUrl)

  logger.info(`Found ${validFetchTasks.length} releases with resource_url to fetch`)

  if (validFetchTasks.length === 0) {
    logger.warn('No releases found with resource_url')
    return releases
  }

  // Process releases in parallel with controlled concurrency and delay
  const results = await pMap(
    validFetchTasks,
    async ({ release, resourceUrl, releaseId }, index) => {
      try {
        // Add delay between requests to avoid rate limiting
        if (index > 0 && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }

        const resourceData = await fetchReleaseDetails(resourceUrl, releaseId)
        
        if (resourceData) {
          logger.debug(`Successfully fetched resource data for release ${releaseId}`)
          
          // Filter resource data to reduce size while keeping essential fields
          const filteredResourceData = filterDiscogsResource(resourceData)
          
          return {
            ...release,
            resource: filteredResourceData // Store filtered resource data
          }
        } else {
          logger.warn(`Failed to fetch resource data for release ${releaseId}`)
          return release
        }
      } catch (error) {
        logger.error(`Error processing release ${releaseId}:`, error)
        return release
      }
    },
    {
      concurrency,
      stopOnError
    }
  )

  // Merge results back with original releases array
  const enhancedReleases = releases.map((originalRelease) => {
    const enhancedRelease = results.find(result => result.id === originalRelease.id)
    return enhancedRelease || originalRelease
  })

  const successCount = results.filter(r => r.resource).length
  logger.info(`Batch fetch completed: ${successCount}/${validFetchTasks.length} releases enhanced with resource data`)

  return enhancedReleases
}

export default fetchReleasesBatch
