const get = require('lodash/get')

/**
 * Select the Google Books API Key.
 */
const selectGoogleBooksAPIKey = config => get(config, 'google.books_api_key')

/**
 * Select the Spotify Client ID.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The Spotify Client ID associated with your application.
 */
const selectSpotifyClientId = config => get(config, 'spotify.client_id')

/**
 * Select the Spotify client secret.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The Spotify Client Secret associated with your application.
 */
const selectSpotifyClientSecret = config => get(config, 'spotify.client_secret')

/**
 * Select the Spotify redirect URI.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} Must match value set in your Spotify developer dashboard.
 */
const selectSpotifyRedirectURI = config => get(config, 'spotify.redirect_uri')

/**
 * Select the Spotify refresh token.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration.
 * @returns {string} The latest Spotify Refresh Token. Used in place of an auth code.
 */
const selectSpotifyRefreshToken = config => get(config, 'spotify.refresh_token')

/**
 * Select the Steam API key.
 * @see {@link https://partner.steamgames.com/doc/webapi_overview/auth#user-keys}
 * @see {@link https://steamcommunity.com/dev/apikey}
 * @param {object} config The current app configuration.
 * @returns {string} The Steam API key.
 */
const selectSteamAPIKey = config => get(config, 'steam.api_key')

/**
 * Select the Steam user identifier.
 * @see {@link https://developer.valvesoftware.com/wiki/Steam_Web_API}
 * @param {object} config The current app configuration.
 * @returns {string} The Steam user id. This numeric value is not the custom username.
 */
const selectSteamUserId = config => get(config, 'steam.user_id')

module.exports = {
  selectGoogleBooksAPIKey,
  selectSpotifyClientId,
  selectSpotifyClientSecret,
  selectSpotifyRedirectURI,
  selectSpotifyRefreshToken,
  selectSteamAPIKey,
  selectSteamUserId,
}
