/**
 * Fetch recent photos from Flickr
 * @see {@link https://www.flickr.com/services/api/flickr.people.getPhotos.html}
 */
declare const fetchPhotos: () => Promise<{
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
    total: number;
    page: number;
    pages: number;
}>;
export default fetchPhotos;
//# sourceMappingURL=fetch-photos.d.ts.map