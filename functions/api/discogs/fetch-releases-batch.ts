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
const fetchReleasesBatch = async (releases: unknown[], options: { concurrency?: number; stopOnError?: boolean; delayMs?: number } = {}) => {
  const { concurrency = 5, stopOnError = false, delayMs = 100 } = options

  logger.info(`Starting batch fetch for ${releases.length} releases with concurrency ${concurrency}`)

  // Create array of fetch tasks - only use resource_url
  const fetchTasks = (releases as Record<string, unknown>[]).map((release, index) => ({
    release,
    index,
    resourceUrl: (release.basic_information as Record<string, unknown>)?.resource_url,
    releaseId: release.id || (release.basic_information as Record<string, unknown>)?.id,
  }))

  // Log releases without resource_url for monitoring
  const releasesWithoutResourceUrl = fetchTasks.filter(task => !task.resourceUrl)
  if (releasesWithoutResourceUrl.length > 0) {
    const r = (x: typeof fetchTasks[0]) => x.release as Record<string, unknown>
    const bi = (x: Record<string, unknown>) => x.basic_information as Record<string, unknown> | undefined
    logger.warn(`Found ${releasesWithoutResourceUrl.length} releases without resource_url`, {
      releaseIds: releasesWithoutResourceUrl.map(task => task.releaseId),
      releases: releasesWithoutResourceUrl.map(task => ({
        id: task.releaseId,
        title: bi(r(task))?.title,
        masterId: bi(r(task))?.master_id,
        masterUrl: bi(r(task))?.master_url,
      })),
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

        const resourceData = await fetchReleaseDetails(resourceUrl as string, releaseId as string)
        
        if (resourceData) {
          logger.debug(`Successfully fetched resource data for release ${releaseId}`)
          
          const filteredResourceData = filterDiscogsResource(resourceData)
          
          return {
            ...(release as object),
            resource: filteredResourceData,
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
  const enhancedReleases = (releases as Record<string, unknown>[]).map((originalRelease) => {
    const enhancedRelease = results.find((r: Record<string, unknown>) => r.id === originalRelease.id)
    return enhancedRelease || originalRelease
  })

  const successCount = results.filter((r: Record<string, unknown>) => r.resource).length
  logger.info(`Batch fetch completed: ${successCount}/${validFetchTasks.length} releases enhanced with resource data`)

  return enhancedReleases
}

export default fetchReleasesBatch
