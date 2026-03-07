import admin from 'firebase-admin';
declare const syncSpotifyTopTracks: () => Promise<{
    result: string;
    error: any;
    tracksSyncedCount?: undefined;
    totalUploadedMediaCount?: undefined;
    widgetContent?: undefined;
} | {
    result: string;
    tracksSyncedCount: any;
    totalUploadedMediaCount: any;
    widgetContent: {
        collections: {
            playlists: any;
            topTracks: any;
        };
        meta: {
            synced: admin.firestore.Timestamp;
            totalUploadedMediaCount: any;
        };
        metrics: {
            displayName: string;
            id: string;
            value: any;
        }[];
        profile: {
            avatarURL: any;
            displayName: any;
            followersCount: any;
            id: any;
            profileURL: any;
        };
    };
    error?: undefined;
}>;
export default syncSpotifyTopTracks;
//# sourceMappingURL=sync-spotify-data.d.ts.map