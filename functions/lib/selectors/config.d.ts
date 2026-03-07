/**
 * Select the Google Books API Key.
 */
declare const selectGoogleBooksAPIKey: (config: any) => any;
/**
 * Select the Spotify Client ID.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The Spotify Client ID associated with your application.
 */
declare const selectSpotifyClientId: (config: any) => any;
/**
 * Select the Spotify client secret.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The Spotify Client Secret associated with your application.
 */
declare const selectSpotifyClientSecret: (config: any) => any;
/**
 * Select the Spotify redirect URI.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} Must match value set in your Spotify developer dashboard.
 */
declare const selectSpotifyRedirectURI: (config: any) => any;
/**
 * Select the Spotify refresh token.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The latest Spotify Refresh Token. Used in place of an auth code.
 */
declare const selectSpotifyRefreshToken: (config: any) => any;
/**
 * Select the Steam API key.
 * @see {@link https://partner.steamgames.com/doc/webapi_overview/auth#user-keys}
 * @see {@link https://steamcommunity.com/dev/apikey}
 * @param {object} config The current app configuration.
 * @returns {string} The Steam API key.
 */
declare const selectSteamAPIKey: (config: any) => any;
/**
 * Select the Steam user identifier.
 * @see {@link https://developer.valvesoftware.com/wiki/Steam_Web_API}
 * @param {object} config The current app configuration.
 * @returns {string} The Steam user id. This numeric value is not the custom username.
 */
declare const selectSteamUserId: (config: any) => any;
export { selectGoogleBooksAPIKey, selectSpotifyClientId, selectSpotifyClientSecret, selectSpotifyRedirectURI, selectSpotifyRefreshToken, selectSteamAPIKey, selectSteamUserId };
//# sourceMappingURL=config.d.ts.map