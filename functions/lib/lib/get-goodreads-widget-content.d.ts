declare const getGoodreadsWidgetContent: () => Promise<{
    meta: {
        synced: Date;
    };
    recentBooks: any[];
    summary: any;
} | {
    meta: any;
    recentBooks?: undefined;
    summary?: undefined;
}>;
export default getGoodreadsWidgetContent;
//# sourceMappingURL=get-goodreads-widget-content.d.ts.map