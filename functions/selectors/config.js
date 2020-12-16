const get = require('lodash/get')

/**
 * Select Google Books API Key
 *
 * Selects the Google Books API key from the config.
 */
const selectGoogleBooksAPIKey = config => get(config, 'google.books_api_key')

module.exports = {
  selectGoogleBooksAPIKey
}
