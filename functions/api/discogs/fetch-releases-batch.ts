import { logger } from 'firebase-functions'
import pMap from 'p-map'
import fetchReleaseDetails from './fetch-release-details.js'
import filterDiscogsResource from '../../transformers/filter-discogs-resource.js'
import type {
  DiscogsBasicInformation,
  DiscogsCollectionReleaseItem,
  DiscogsEnhancedRelease,
} from '../../types/discogs.js'
import type { SyncProgressReporter } from '../../types/sync-pipeline.js'

/** @internal exported for tests */
export const discogsReleaseLabel = (release: DiscogsCollectionReleaseItem): string => {
  const bi: DiscogsBasicInformation | undefined = release.basic_information
  const raw = bi?.title
  const title =
    typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : `Release ${release.id}`
  return title.length > 72 ? `${title.slice(0, 69)}…` : title
}

/**
 * Fetches detailed release resource data for all releases in a batch
 * @param {Array} releases - Array of release objects from Discogs collection API
 * @param {Object} options - Configuration options
 * @param {number} options.concurrency - Number of concurrent requests (default: 5)
 * @param {boolean} options.stopOnError - Whether to stop on first error (default: false)
 * @param {number} options.delayMs - Delay between requests in milliseconds (default: 100)
 * @returns {Promise<Array>} Array of enhanced releases with resource data
 */
const fetchReleasesBatch = async (
  releases: DiscogsCollectionReleaseItem[],
  options: {
    concurrency?: number
    delayMs?: number
    onProgress?: SyncProgressReporter
    stopOnError?: boolean
  } = {},
): Promise<DiscogsEnhancedRelease[]> => {
  const { concurrency = 5, stopOnError = false, delayMs = 100, onProgress } = options

  logger.info(`Starting batch fetch for ${releases.length} releases with concurrency ${concurrency}`)

  // Create array of fetch tasks - only use resource_url
  const fetchTasks = releases.map((release, index) => ({
    release,
    index,
    resourceUrl: release.basic_information?.resource_url,
    releaseId: release.id ?? release.basic_information?.id,
  }))

  // Log releases without resource_url for monitoring
  const releasesWithoutResourceUrl = fetchTasks.filter(task => !task.resourceUrl)
  if (releasesWithoutResourceUrl.length > 0) {
    logger.warn(`Found ${releasesWithoutResourceUrl.length} releases without resource_url`, {
      releaseIds: releasesWithoutResourceUrl.map(task => task.releaseId),
      releases: releasesWithoutResourceUrl.map(task => {
        const bi = task.release.basic_information
        return {
          id: task.releaseId,
          title: bi?.title,
          masterId: bi?.master_id,
          masterUrl: bi?.master_url,
        }
      }),
    })
  }

  // Filter to only include releases that have a resource_url
  const validFetchTasks = fetchTasks.filter(task => task.resourceUrl)

  logger.info(`Found ${validFetchTasks.length} releases with resource_url to fetch`)

  if (validFetchTasks.length === 0) {
    logger.warn('No releases found with resource_url')
    return releases
  }

  onProgress?.({
    phase: 'discogs.batch',
    message: `Fetching full Discogs data for ${validFetchTasks.length} records (rate-limited; may take a few minutes).`,
  })

  // Process releases in parallel with controlled concurrency and delay
  const results = await pMap(
    validFetchTasks,
    async ({ release, resourceUrl, releaseId }, index) => {
      try {
        // Add delay between requests to avoid rate limiting
        if (index > 0 && delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }

        const label = discogsReleaseLabel(release)
        onProgress?.({
          phase: 'discogs.release',
          message: `Fetching record from Discogs: ${label}`,
        })

        const resourceData = await fetchReleaseDetails(
          resourceUrl as string,
          String(releaseId ?? ''),
        )
        
        if (resourceData) {
          logger.debug(`Successfully fetched resource data for release ${releaseId}`)
          
          const filteredResourceData = filterDiscogsResource(resourceData)
          
          return {
            ...release,
            resource: filteredResourceData,
          } as DiscogsEnhancedRelease
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
    const enhancedRelease = results.find((r) => r.id === originalRelease.id)
    return (enhancedRelease ?? originalRelease) as DiscogsEnhancedRelease
  })

  const successCount = results.filter((r) => 'resource' in r && r.resource).length
  logger.info(`Batch fetch completed: ${successCount}/${validFetchTasks.length} releases enhanced with resource data`)

  return enhancedReleases
}

export default fetchReleasesBatch
