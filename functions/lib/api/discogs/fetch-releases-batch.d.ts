/**
 * Fetches detailed release resource data for all releases in a batch
 * @param {Array} releases - Array of release objects from Discogs collection API
 * @param {Object} options - Configuration options
 * @param {number} options.concurrency - Number of concurrent requests (default: 5)
 * @param {boolean} options.stopOnError - Whether to stop on first error (default: false)
 * @param {number} options.delayMs - Delay between requests in milliseconds (default: 100)
 * @returns {Promise<Array>} Array of enhanced releases with resource data
 */
declare const fetchReleasesBatch: (releases: unknown[], options?: {
    concurrency?: number;
    stopOnError?: boolean;
    delayMs?: number;
}) => Promise<unknown[]>;
export default fetchReleasesBatch;
//# sourceMappingURL=fetch-releases-batch.d.ts.map