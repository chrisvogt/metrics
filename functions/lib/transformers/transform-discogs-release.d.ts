declare const transformDiscogsRelease: (rawRelease: any) => {
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
};
export default transformDiscogsRelease;
//# sourceMappingURL=transform-discogs-release.d.ts.map