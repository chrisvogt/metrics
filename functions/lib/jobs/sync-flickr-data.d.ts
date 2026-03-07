import admin from 'firebase-admin';
/**
 * Sync Flickr Data
 *
 * Fetches recent photos from Flickr and stores them in Firestore.
 * Photos are stored with their metadata and URLs to different sizes.
 */
declare const syncFlickrData: () => Promise<{
    result: string;
    widgetContent: {
        collections: {
            photos: {
                id: unknown;
                title: unknown;
                description: unknown;
                dateTaken: unknown;
                ownerName: unknown;
                thumbnailUrl: unknown;
                mediumUrl: unknown;
                largeUrl: unknown;
                link: string;
            }[];
        };
        meta: {
            synced: admin.firestore.Timestamp;
        };
        metrics: {
            displayName: string;
            id: string;
            value: number;
        }[];
        profile: {
            displayName: string;
            profileURL: string;
        };
    };
    error?: undefined;
} | {
    result: string;
    error: any;
    widgetContent?: undefined;
}>;
export default syncFlickrData;
//# sourceMappingURL=sync-flickr-data.d.ts.map