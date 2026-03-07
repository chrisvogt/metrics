/**
 * Sync Steam Data
 *
 * To Do:
 *
 * - [ ] Handle images
 *
 * https://cdn.cloudflare.steamstatic.com/steam/apps/{steamId}/{fileName}.jpg
 * Example: https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/capsule_231x87.jpg
 *
 * Available files:
 *
 *  - hero_capsule.jpg
 *  - capsule_616x353.jpg
 *  - header.jpg
 *  - capsule_231x87.jpg
 */
declare const syncSteamData: () => Promise<{
    result: string;
    data: Record<string, unknown>;
    error?: undefined;
} | {
    result: string;
    error: any;
    data?: undefined;
}>;
export default syncSteamData;
//# sourceMappingURL=sync-steam-data.d.ts.map