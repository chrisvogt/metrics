declare const getAccessToken: ({ clientId, clientSecret, redirectURI, refreshToken }: {
    clientId: any;
    clientSecret: any;
    redirectURI: any;
    refreshToken: any;
}) => Promise<{
    accessToken: string;
    expiresAt: Date;
    scope: string;
}>;
export default getAccessToken;
//# sourceMappingURL=get-access-token.d.ts.map