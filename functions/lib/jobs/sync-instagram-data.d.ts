import admin from 'firebase-admin';
declare const syncInstagramData: () => Promise<{
    data: {
        media: {
            caption: any;
            cdnMediaURL: string;
            children: any;
            commentsCounts: any;
            id: any;
            likeCount: any;
            mediaType: any;
            mediaURL: any;
            permalink: any;
            shortcode: any;
            thumbnailURL: any;
            timestamp: any;
            username: any;
        }[];
        meta: {
            synced: admin.firestore.Timestamp;
        };
        profile: {
            biography: string;
            followersCount: number;
            mediaCount: number;
            username: string;
        };
    };
    ok: boolean;
    result: string;
    totalUploadedCount: number;
    destinationBucket?: undefined;
    uploadedFiles?: undefined;
    error?: undefined;
} | {
    destinationBucket: string;
    result: string;
    totalUploadedCount: number;
    uploadedFiles: string[];
    data: {
        media: {
            caption: any;
            cdnMediaURL: string;
            children: any;
            commentsCounts: any;
            id: any;
            likeCount: any;
            mediaType: any;
            mediaURL: any;
            permalink: any;
            shortcode: any;
            thumbnailURL: any;
            timestamp: any;
            username: any;
        }[];
        meta: {
            synced: admin.firestore.Timestamp;
        };
        profile: {
            biography: string;
            followersCount: number;
            mediaCount: number;
            username: string;
        };
    };
    ok?: undefined;
    error?: undefined;
} | {
    result: string;
    error: any;
    data?: undefined;
    ok?: undefined;
    totalUploadedCount?: undefined;
    destinationBucket?: undefined;
    uploadedFiles?: undefined;
}>;
export default syncInstagramData;
//# sourceMappingURL=sync-instagram-data.d.ts.map