declare const fetchDiscogsReleases: () => Promise<{
    pagination: {
        page: number;
        pages: number;
        per_page: number;
        items: number;
        urls: {};
    };
    releases: any[];
}>;
export default fetchDiscogsReleases;
//# sourceMappingURL=fetch-releases.d.ts.map