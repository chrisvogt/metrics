import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { setupEnvVars, envVarMappings } from './setup-env-vars.js'

// Mock fs, path, and child_process
vi.mock('fs')
vi.mock('path')
vi.mock('child_process')

describe('setup-env-vars.js', () => {
  let log, warn, error, execSyncImpl

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock path.join to return a predictable path
    path.join.mockReturnValue('/mock/path/.runtimeconfig.json')
    
    // Mock fs.readFileSync to return a mock runtime config
    fs.readFileSync.mockReturnValue(JSON.stringify({
      gemini: {
        api_key: 'test-gemini-key'
      },
      storage: {
        firestore_database_url: 'https://test.firebaseio.com',
        cloud_storage_images_bucket: 'test-bucket',
        image_cdn_base_url: 'https://cdn.test.com'
      },
      discogs: {
        api_key: 'test-discogs-key',
        username: 'testuser'
      },
      flickr: {
        api_key: 'test-flickr-key',
        user_id: '123456'
      },
      steam: {
        api_key: 'test-steam-key',
        user_id: 'steam123'
      },
      github: {
        access_token: 'test-github-token',
        username: 'githubuser'
      },
      spotify: {
        client_id: 'test-spotify-client',
        client_secret: 'test-spotify-secret',
        redirect_uri: 'https://test.com/callback',
        refresh_token: 'test-refresh-token'
      },
      goodreads: {
        key: 'test-goodreads-key',
        user_id: 'goodreads123'
      },
      instagram: {
        access_token: 'test-instagram-token'
      },
      google: {
        books_api_key: 'test-google-books-key'
      }
    }))
    
    execSyncImpl = vi.fn()
    log = vi.fn()
    warn = vi.fn()
    error = vi.fn()
  })

  it('should set up all environment variables successfully (real function)', () => {
    const runtimeConfig = JSON.parse(fs.readFileSync('/mock/path/.runtimeconfig.json', 'utf8'))
    setupEnvVars({ runtimeConfig, execSyncImpl, log, warn, error })

    // All envVarMappings keys should be processed
    Object.entries(envVarMappings).forEach(([configPath, envVar]) => {
      const value = configPath.split('.').reduce((obj, key) => obj?.[key], runtimeConfig)
      if (value) {
        expect(execSyncImpl).toHaveBeenCalledWith(
          `firebase functions:config:set ${configPath}="${value}"`,
          { stdio: 'inherit' }
        )
        expect(log).toHaveBeenCalledWith(expect.stringContaining(envVar))
      } else {
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(configPath))
      }
    })
  })

  it('should handle missing values gracefully', () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({
      gemini: {
        api_key: 'test-gemini-key'
      }
      // Missing other configs
    }))
    const runtimeConfig = JSON.parse(fs.readFileSync('/mock/path/.runtimeconfig.json', 'utf8'))
    setupEnvVars({ runtimeConfig, execSyncImpl, log, warn, error })
    // Should warn for missing
    expect(warn).toHaveBeenCalled()
  })

  it('should handle execSync errors', () => {
    execSyncImpl.mockImplementation(() => { throw new Error('Command failed') })
    const runtimeConfig = JSON.parse(fs.readFileSync('/mock/path/.runtimeconfig.json', 'utf8'))
    setupEnvVars({ runtimeConfig, execSyncImpl, log, warn, error })
    expect(error).toHaveBeenCalled()
  })
}) 