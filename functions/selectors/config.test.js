import { describe, it, expect } from 'vitest'

const {
  selectGoogleBooksAPIKey,
  selectSpotifyClientId,
  selectSpotifyClientSecret,
  selectSpotifyRedirectURI,
  selectSpotifyRefreshToken,
  selectSteamAPIKey,
  selectSteamUserId
} = require('./config')

describe('config selectors', () => {
  const mockConfig = {
    google: {
      books_api_key: '0000000000000000000000000000000000000000'
    },
    spotify: {
      client_id: '0000000000000000000000000000000000000000',
      client_secret: '0000000000000000000000000000000000000000',
      redirect_uri: 'https://example.com/callback',
      refresh_token: '0000000000000000000000000000000000000000'
    },
    steam: {
      api_key: '0000000000000000000000000000000000000000',
      user_id: '0000000000000000000000000000000000000000'
    }
  }

  describe('selectGoogleBooksAPIKey', () => {
    it('should return the Google Books API key when present', () => {
      const result = selectGoogleBooksAPIKey(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectGoogleBooksAPIKey(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when config is undefined', () => {
      const result = selectGoogleBooksAPIKey(undefined)
      expect(result).toBeUndefined()
    })

    it('should return undefined when google property is missing', () => {
      const configWithoutGoogle = { spotify: mockConfig.spotify, steam: mockConfig.steam }
      const result = selectGoogleBooksAPIKey(configWithoutGoogle)
      expect(result).toBeUndefined()
    })

    it('should return undefined when books_api_key is missing', () => {
      const configWithoutAPIKey = {
        ...mockConfig,
        google: { other_key: 'some-value' }
      }
      const result = selectGoogleBooksAPIKey(configWithoutAPIKey)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSpotifyClientId', () => {
    it('should return the Spotify client ID when present', () => {
      const result = selectSpotifyClientId(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectSpotifyClientId(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when spotify property is missing', () => {
      const configWithoutSpotify = { google: mockConfig.google, steam: mockConfig.steam }
      const result = selectSpotifyClientId(configWithoutSpotify)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSpotifyClientSecret', () => {
    it('should return the Spotify client secret when present', () => {
      const result = selectSpotifyClientSecret(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectSpotifyClientSecret(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when client_secret is missing', () => {
      const configWithoutSecret = {
        ...mockConfig,
        spotify: { ...mockConfig.spotify }
      }
      delete configWithoutSecret.spotify.client_secret
      const result = selectSpotifyClientSecret(configWithoutSecret)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSpotifyRedirectURI', () => {
    it('should return the Spotify redirect URI when present', () => {
      const result = selectSpotifyRedirectURI(mockConfig)
      expect(result).toBe('https://example.com/callback')
    })

    it('should return undefined when config is null', () => {
      const result = selectSpotifyRedirectURI(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when redirect_uri is missing', () => {
      const configWithoutRedirect = {
        ...mockConfig,
        spotify: { ...mockConfig.spotify }
      }
      delete configWithoutRedirect.spotify.redirect_uri
      const result = selectSpotifyRedirectURI(configWithoutRedirect)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSpotifyRefreshToken', () => {
    it('should return the Spotify refresh token when present', () => {
      const result = selectSpotifyRefreshToken(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectSpotifyRefreshToken(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when refresh_token is missing', () => {
      const configWithoutRefresh = {
        ...mockConfig,
        spotify: { ...mockConfig.spotify }
      }
      delete configWithoutRefresh.spotify.refresh_token
      const result = selectSpotifyRefreshToken(configWithoutRefresh)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSteamAPIKey', () => {
    it('should return the Steam API key when present', () => {
      const result = selectSteamAPIKey(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectSteamAPIKey(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when steam property is missing', () => {
      const configWithoutSteam = { google: mockConfig.google, spotify: mockConfig.spotify }
      const result = selectSteamAPIKey(configWithoutSteam)
      expect(result).toBeUndefined()
    })
  })

  describe('selectSteamUserId', () => {
    it('should return the Steam user ID when present', () => {
      const result = selectSteamUserId(mockConfig)
      expect(result).toBe('0000000000000000000000000000000000000000')
    })

    it('should return undefined when config is null', () => {
      const result = selectSteamUserId(null)
      expect(result).toBeUndefined()
    })

    it('should return undefined when user_id is missing', () => {
      const configWithoutUserId = {
        ...mockConfig,
        steam: { ...mockConfig.steam }
      }
      delete configWithoutUserId.steam.user_id
      const result = selectSteamUserId(configWithoutUserId)
      expect(result).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle empty config object', () => {
      const emptyConfig = {}
      expect(selectGoogleBooksAPIKey(emptyConfig)).toBeUndefined()
      expect(selectSpotifyClientId(emptyConfig)).toBeUndefined()
      expect(selectSteamAPIKey(emptyConfig)).toBeUndefined()
    })

    it('should handle config with empty nested objects', () => {
      const configWithEmptyObjects = {
        google: {},
        spotify: {},
        steam: {}
      }
      expect(selectGoogleBooksAPIKey(configWithEmptyObjects)).toBeUndefined()
      expect(selectSpotifyClientId(configWithEmptyObjects)).toBeUndefined()
      expect(selectSteamAPIKey(configWithEmptyObjects)).toBeUndefined()
    })

    it('should handle config with null nested objects', () => {
      const configWithNullObjects = {
        google: null,
        spotify: null,
        steam: null
      }
      expect(selectGoogleBooksAPIKey(configWithNullObjects)).toBeUndefined()
      expect(selectSpotifyClientId(configWithNullObjects)).toBeUndefined()
      expect(selectSteamAPIKey(configWithNullObjects)).toBeUndefined()
    })
  })
}) 