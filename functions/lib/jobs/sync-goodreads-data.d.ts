/**
 * Sync Goodreads Data
 */
declare const syncGoodreadsData: () => Promise<{
    result: string;
    error: any;
    data?: undefined;
} | {
    result: string;
    data: Record<string, unknown>;
    error?: undefined;
}>;
export default syncGoodreadsData;
//# sourceMappingURL=sync-goodreads-data.d.ts.map