/**
 * Fetches detailed release resource data from Discogs API with retry logic
 * @param {string} resourceUrl - The resource_url to fetch
 * @param {string} releaseId - The release ID for logging purposes
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Object|null>} The detailed release resource data or null if failed
 */
declare const fetchReleaseDetails: (resourceUrl: any, releaseId: any, maxRetries?: number) => Promise<unknown>;
export default fetchReleaseDetails;
//# sourceMappingURL=fetch-release-details.d.ts.map