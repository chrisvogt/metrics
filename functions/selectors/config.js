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
 * Select the Spotify Client Secret.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration. 
 * @returns {string} The Spotify Client Secret associated with your application.
 */
const selectSpotifyClientSecret = config => get(config, 'spotify.client_secret')

/**
 * Select the Spotify Redirect URI.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration. 
 * @returns {string} Must match value set in your Spotify developer dashboard.
 */
const selectSpotifyRedirectURI = config => get(config, 'spotify.redirect_uri')

/**
 * Select the Spotify Refresh Token.
 * @see {@link https://developer.spotify.com/documentation/general/guides/authorization-guide/}
 * @param {object} config The current app configuration. 
 * @returns {string} The latest Spotify Refresh Token. Used in place of an auth code.
 */
const selectSpotifyRefreshToken = config => get(config, 'spotify.refresh_token')

module.exports = {
  selectGoogleBooksAPIKey,
  selectSpotifyClientId,
  selectSpotifyClientSecret,
  selectSpotifyRedirectURI,
  selectSpotifyRefreshToken
}
