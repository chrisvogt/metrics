import admin from 'firebase-admin';
declare const syncDiscogsData: () => Promise<{
    data: {
        collections: {
            releases: {
                resource: any;
                id: any;
                instanceId: any;
                dateAdded: any;
                rating: any;
                folderId: any;
                notes: any;
                basicInformation: {
                    id: any;
                    masterId: any;
                    masterUrl: any;
                    resourceUrl: any;
                    thumb: any;
                    coverImage: any;
                    cdnThumbUrl: string;
                    cdnCoverUrl: string;
                    title: any;
                    year: any;
                    formats: any;
                    labels: any;
                    artists: any;
                    genres: any;
                    styles: any;
                };
            }[];
        };
        metrics: {
            'LPs Owned': number;
        };
        profile: {
            profileURL: string;
        };
        meta: {
            synced: admin.firestore.Timestamp;
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
        collections: {
            releases: {
                resource: any;
                id: any;
                instanceId: any;
                dateAdded: any;
                rating: any;
                folderId: any;
                notes: any;
                basicInformation: {
                    id: any;
                    masterId: any;
                    masterUrl: any;
                    resourceUrl: any;
                    thumb: any;
                    coverImage: any;
                    cdnThumbUrl: string;
                    cdnCoverUrl: string;
                    title: any;
                    year: any;
                    formats: any;
                    labels: any;
                    artists: any;
                    genres: any;
                    styles: any;
                };
            }[];
        };
        metrics: {
            'LPs Owned': number;
        };
        profile: {
            profileURL: string;
        };
        meta: {
            synced: admin.firestore.Timestamp;
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
export default syncDiscogsData;
//# sourceMappingURL=sync-discogs-data.d.ts.map