const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions')
const app = require('./app')

// Import your sync jobs
const syncGoodreadsData = require('./jobs/sync-goodreads-data')
const syncInstagramData = require('./jobs/sync-instagram-data')
const syncSpotifyData = require('./jobs/sync-spotify-data')
const syncSteamData = require('./jobs/sync-steam-data')

// Scheduled functions
exports.syncGoodreadsDataSecondGen = onSchedule(
  { schedule: 'every day 02:00' },
  async () => {
    try {
      await syncGoodreadsData()
      logger.info('Goodreads data synced successfully.')
    } catch (error) {
      logger.error('Error syncing Goodreads data:', error)
    }
  }
)

exports.syncSpotifyDataSecondGen = onSchedule(
  { schedule: 'every day 02:00' },
  async () => {
    try {
      await syncSpotifyData()
      logger.info('Spotify data synced successfully.')
    } catch (error) {
      logger.error('Error syncing Spotify data:', error)
    }
  }
)

exports.syncSteamDataSecondGen = onSchedule(
  { schedule: 'every day 02:00' },
  async () => {
    try {
      await syncSteamData()
      logger.info('Steam data synced successfully.')
    } catch (error) {
      logger.error('Error syncing Steam data:', error)
    }
  }
)

exports.syncInstagramDataSecondGen = onSchedule(
  { schedule: 'every day 02:00' },
  async () => {
    try {
      await syncInstagramData()
      logger.info('Instagram data synced successfully.')
    } catch (error) {
      logger.error('Error syncing Instagram data:', error)
    }
  }
)

// Export your Express app as a Cloud Function
exports.appSecondGen = onRequest(app)
