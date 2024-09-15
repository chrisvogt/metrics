// index.js

const { onRequest } = require('firebase-functions/v2/https')
// const { onSchedule } = require('firebase-functions/v2/scheduler')
const app = require('./app')
// const { logger } = require('firebase-functions')
// const syncGoodreadsData = require('./jobs/sync-goodreads-data')
// const syncInstagramData = require('./jobs/sync-instagram-data')
// const syncSpotifyData = require('./jobs/sync-spotify-data')
// const syncSteamData = require('./jobs/sync-steam-data')

// Express App HTTP Function
exports.appSecondGen = onRequest(
  {
    secrets: [
      'GITHUB_ACCESS_TOKEN',
      'GITHUB_USERNAME',
      'GOODREADS_ACCESS_TOKEN',
      'GOODREADS_API_KEY',
      'GOODREADS_USER_ID',
      'GOOGLE_BOOKS_API_KEY',
      'INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_USER_ID',
      'SPOTIFY_CLIENT_ID',
      'SPOTIFY_CLIENT_SECRET',
      'SPOTIFY_REDIRECT_URI',
      'SPOTIFY_REFRESH_TOKEN',
      'STEAM_API_KEY',
      'STEAM_USER_ID',
    ],
  },
  app
)

// Scheduled Functions

// exports.syncGoodreadsDataSecondGen = onSchedule(
//   {
//     schedule: 'every day 02:00',
//     secrets: [
//       'GOODREADS_ACCESS_TOKEN',
//       'GOODREADS_API_KEY',
//       'GOODREADS_USER_ID',
//       'GOOGLE_BOOKS_API_KEY',
//     ],
//   },
//   async () => {
//     try {
//       await syncGoodreadsData()
//       logger.info('Goodreads data synced successfully.')
//     } catch (error) {
//       logger.error('Error syncing Goodreads data:', error)
//     }
//   }
// )

// exports.syncInstagramDataSecondGen = onSchedule(
//   {
//     schedule: 'every day 02:00',
//     secrets: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID'],
//   },
//   async () => {
//     try {
//       await syncInstagramData()
//       logger.info('Instagram data synced successfully.')
//     } catch (error) {
//       logger.error('Error syncing Instagram data:', error)
//     }
//   }
// )

// exports.syncSpotifyDataSecondGen = onSchedule(
//   {
//     schedule: 'every day 02:00',
//     secrets: [
//       'SPOTIFY_CLIENT_ID',
//       'SPOTIFY_CLIENT_SECRET',
//       'SPOTIFY_REDIRECT_URI',
//       'SPOTIFY_REFRESH_TOKEN',
//     ],
//   },
//   async () => {
//     try {
//       await syncSpotifyData()
//       logger.info('Spotify data synced successfully.')
//     } catch (error) {
//       logger.error('Error syncing Spotify data:', error)
//     }
//   }
// )

// exports.syncSteamDataSecondGen = onSchedule(
//   {
//     schedule: 'every day 02:00',
//     secrets: ['STEAM_API_KEY', 'STEAM_USER_ID'],
//   },
//   async () => {
//     try {
//       await syncSteamData()
//       logger.info('Steam data synced successfully.')
//     } catch (error) {
//       logger.error('Error syncing Steam data:', error)
//     }
//   }
// )
