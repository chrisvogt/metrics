declare const getInstagramWidgetContent: (userId: any) => Promise<{
    collections: {
        media: any;
    };
    meta: {
        synced: Date;
    };
    metrics: {
        displayName: string;
        id: string;
        value: any;
    }[];
    provider: {
        displayName: string;
        id: string;
    };
    profile: {
        biography: any;
        displayName: any;
        profileURL: string;
    };
}>;
export default getInstagramWidgetContent;
//# sourceMappingURL=get-instagram-widget-content.d.ts.map