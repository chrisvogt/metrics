import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyExportedConfigToEnv, CONFIG_PATH_TO_ENV } from './exported-config.js'

describe('exported-config', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('CONFIG_PATH_TO_ENV', () => {
    it('includes expected config paths', () => {
      expect(CONFIG_PATH_TO_ENV['github.access_token']).toBe('GITHUB_ACCESS_TOKEN')
      expect(CONFIG_PATH_TO_ENV['auth.client_api_key']).toBe('CLIENT_API_KEY')
      expect(CONFIG_PATH_TO_ENV['spotify.client_id']).toBe('SPOTIFY_CLIENT_ID')
    })
  })

  describe('applyExportedConfigToEnv', () => {
    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    it('sets process.env from nested data when value is string', () => {
      const data = {
        github: { access_token: 'secret-token', username: 'myuser' },
        auth: { client_api_key: 'api-key' },
      }
      applyExportedConfigToEnv(data)
      expect(process.env.GITHUB_ACCESS_TOKEN).toBe('secret-token')
      expect(process.env.GITHUB_USERNAME).toBe('myuser')
      expect(process.env.CLIENT_API_KEY).toBe('api-key')
    })

    it('skips non-string values', () => {
      process.env.GITHUB_ACCESS_TOKEN = 'existing'
      const data = { github: { access_token: 12345 } }
      applyExportedConfigToEnv(data)
      expect(process.env.GITHUB_ACCESS_TOKEN).toBe('existing')
    })

    it('skips when data is null or not an object', () => {
      applyExportedConfigToEnv(null)
      applyExportedConfigToEnv(undefined)
      applyExportedConfigToEnv('string')
      expect(process.env.GITHUB_ACCESS_TOKEN).toBeUndefined()
    })

    it('skips missing paths', () => {
      const data = { github: { username: 'user' } }
      applyExportedConfigToEnv(data)
      expect(process.env.GITHUB_ACCESS_TOKEN).toBeUndefined()
      expect(process.env.GITHUB_USERNAME).toBe('user')
    })
  })
})
