declare const getReview: (update: any) => {
    actionText: any;
    actor: {
        imageURL: any;
        link: any;
        name: any;
    };
    book: {
        author: {
            averageRating: any;
            goodreadsID: any;
            imageURL: any;
            hasImageURL: any;
            smallImageURL: any;
            hasSmallImageURL: any;
            ratingsCount: any;
            textReviewCount: any;
        };
        goodreadsID: any;
        link: any;
        title: any;
    };
    link: any;
    rating: number;
    type: any;
    updated: any;
};
export default getReview;
//# sourceMappingURL=get-review.d.ts.map