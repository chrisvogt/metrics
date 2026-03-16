import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase-admin/firestore'

import syncSpotifyData from './sync-spotify-data.js'
import type { DocumentStore } from '../ports/document-store.js'

vi.mock('../config/backend-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/backend-config.js')>()
  return {
    ...actual,
    getSpotifyConfig: vi.fn(() => ({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost/callback',
      refreshToken: 'refresh-token',
    })),
  }
})

vi.mock('../api/spotify/get-access-token.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/spotify/get-playlists.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/spotify/get-top-tracks.js', () => ({
  default: vi.fn(),
}))

vi.mock('../api/spotify/get-user-profile.js', () => ({
  default: vi.fn(),
}))

vi.mock('../services/media/media-service.js', () => ({
  listStoredMedia: vi.fn(),
  storeRemoteMedia: vi.fn(async (item) => ({ fileName: item.destinationPath })),
  toPublicMediaUrl: vi.fn((path) => `https://cdn.example.com/${path}`),
}))

vi.mock('../transformers/track-to-collection-item.js', () => ({
  default: vi.fn((track) => ({ id: track.id, displayName: track.name })),
}))

vi.mock('firebase-functions', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import getSpotifyAccessToken from '../api/spotify/get-access-token.js'
import getSpotifyPlaylists from '../api/spotify/get-playlists.js'
import getSpotifyTopTracks from '../api/spotify/get-top-tracks.js'
import getSpotifyUserProfile from '../api/spotify/get-user-profile.js'
import { listStoredMedia } from '../services/media/media-service.js'

describe('syncSpotifyData', () => {
  let documentStore: DocumentStore

  beforeEach(() => {
    vi.clearAllMocks()
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('should successfully sync Spotify data to the document store', async () => {
    vi.mocked(getSpotifyAccessToken).mockResolvedValue({ accessToken: 'spotify-token' })
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({
      display_name: 'Test User',
      external_urls: { spotify: 'https://open.spotify.com/user/test' },
      followers: { total: 100 },
      id: 'user123',
      images: [{ url: 'https://example.com/avatar.jpg' }],
    })
    vi.mocked(getSpotifyTopTracks).mockResolvedValue([{ id: 'track1', name: 'Track 1' }])
    vi.mocked(getSpotifyPlaylists).mockResolvedValue({
      total: 1,
      items: [
        {
          id: 'playlist1',
          name: 'Playlist 1',
          images: [{ url: 'https://mosaic.scdn.co/300/hash123', height: 300, width: 300 }],
        },
      ],
    })
    vi.mocked(listStoredMedia).mockResolvedValue([])

    const result = await syncSpotifyData(documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.tracksSyncedCount).toBe(1)
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/spotify/last-response_playlists',
      expect.objectContaining({
        response: expect.any(Object),
        fetchedAt: expect.any(Timestamp),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/spotify/last-response_top-tracks',
      expect.objectContaining({
        response: [{ id: 'track1', name: 'Track 1' }],
        fetchedAt: expect.any(Timestamp),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/spotify/last-response_user-profile',
      expect.objectContaining({
        response: expect.any(Object),
        fetchedAt: expect.any(Timestamp),
      })
    )
    expect(documentStore.setDocument).toHaveBeenCalledWith(
      'users/chrisvogt/spotify/widget-content',
      expect.objectContaining({
        meta: {
          synced: expect.any(Timestamp),
          totalUploadedMediaCount: 1,
        },
      })
    )
  })

  it('should fail when no access token is available', async () => {
    vi.mocked(getSpotifyAccessToken).mockResolvedValue({ accessToken: '' })

    const result = await syncSpotifyData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Need a valid access token to call Spotify API.',
    })
    expect(documentStore.setDocument).not.toHaveBeenCalled()
  })

  it('should fail when the document store rejects', async () => {
    vi.mocked(getSpotifyAccessToken).mockResolvedValue({ accessToken: 'spotify-token' })
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({
      display_name: 'Test User',
      external_urls: { spotify: 'https://open.spotify.com/user/test' },
      followers: { total: 100 },
      id: 'user123',
      images: [{ url: 'https://example.com/avatar.jpg' }],
    })
    vi.mocked(getSpotifyTopTracks).mockResolvedValue([])
    vi.mocked(getSpotifyPlaylists).mockResolvedValue({ total: 0, items: [] })
    vi.mocked(listStoredMedia).mockResolvedValue([])
    vi.mocked(documentStore.setDocument).mockRejectedValue(new Error('DocumentStore Error'))

    const result = await syncSpotifyData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: new Error('DocumentStore Error'),
    })
  })

  it('should fail when fetching top tracks fails', async () => {
    vi.mocked(getSpotifyAccessToken).mockResolvedValue({ accessToken: 'spotify-token' })
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({
      display_name: 'Test User',
      external_urls: { spotify: 'https://open.spotify.com/user/test' },
      followers: { total: 100 },
      id: 'user123',
      images: [{ url: 'https://example.com/avatar.jpg' }],
    })
    vi.mocked(getSpotifyTopTracks).mockRejectedValue(new Error('Top tracks failed'))

    const result = await syncSpotifyData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: new Error('Top tracks failed'),
    })
  })

  it('should fail when fetching playlists fails', async () => {
    vi.mocked(getSpotifyAccessToken).mockResolvedValue({ accessToken: 'spotify-token' })
    vi.mocked(getSpotifyUserProfile).mockResolvedValue({
      display_name: 'Test User',
      external_urls: { spotify: 'https://open.spotify.com/user/test' },
      followers: { total: 100 },
      id: 'user123',
      images: [{ url: 'https://example.com/avatar.jpg' }],
    })
    vi.mocked(getSpotifyTopTracks).mockResolvedValue([])
    vi.mocked(getSpotifyPlaylists).mockRejectedValue(new Error('Playlists failed'))

    const result = await syncSpotifyData(documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: new Error('Playlists failed'),
    })
  })
})
