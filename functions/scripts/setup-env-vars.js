#!/usr/bin/env node

/**
 * Script to set up environment variables for Firebase Functions v2
 * Run this script to set all environment variables from your .runtimeconfig.json
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Read the runtime config
const runtimeConfigPath = path.join(__dirname, '..', '.runtimeconfig.json')
const runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'))

// Environment variable mappings
const envVarMappings = {
  // Firebase
  'firebase.gemini_api_key': 'GEMINI_API_KEY',
  
  // Storage
  'storage.firestore_database_url': 'STORAGE_FIRESTORE_DATABASE_URL',
  'storage.cloud_storage_images_bucket': 'CLOUD_STORAGE_IMAGES_BUCKET',
  'storage.image_cdn_base_url': 'IMAGE_CDN_BASE_URL',
  
  // Flickr
  'flickr.api_key': 'FLICKR_API_KEY',
  'flickr.user_id': 'FLICKR_USER_ID',
  
  // Steam
  'steam.api_key': 'STEAM_API_KEY',
  'steam.user_id': 'STEAM_USER_ID',
  
  // GitHub
  'github.access_token': 'GITHUB_ACCESS_TOKEN',
  'github.username': 'GITHUB_USERNAME',
  
  // Spotify
  'spotify.client_id': 'SPOTIFY_CLIENT_ID',
  'spotify.client_secret': 'SPOTIFY_CLIENT_SECRET',
  'spotify.redirect_uri': 'SPOTIFY_REDIRECT_URI',
  'spotify.refresh_token': 'SPOTIFY_REFRESH_TOKEN',
  
  // Goodreads
  'goodreads.key': 'GOODREADS_API_KEY',
  'goodreads.user_id': 'GOODREADS_USER_ID',
  
  // Instagram
  'instagram.access_token': 'INSTAGRAM_ACCESS_TOKEN',
  
  // Google Books
  'google.books_api_key': 'GOOGLE_BOOKS_API_KEY'
}

console.log('Setting up environment variables for Firebase Functions v2...\n')

// Set each environment variable
Object.entries(envVarMappings).forEach(([configPath, envVar]) => {
  const value = configPath.split('.').reduce((obj, key) => obj?.[key], runtimeConfig)
  
  if (value) {
    try {
      // Use Firebase CLI to set the environment variable
      const command = `firebase functions:config:set ${configPath}="${value}"`
      console.log(`Setting ${envVar}...`)
      execSync(command, { stdio: 'inherit' })
    } catch (error) {
      console.error(`Failed to set ${envVar}:`, error.message)
    }
  } else {
    console.warn(`Warning: No value found for ${configPath}`)
  }
})

console.log('\nEnvironment variables setup complete!')
console.log('\nNext steps:')
console.log('1. Deploy your functions: firebase deploy --only functions')
console.log('2. For local development, create a .env file with the same variables')
console.log('3. You can now safely delete .runtimeconfig.json if you want') 