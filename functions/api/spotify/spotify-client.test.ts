import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('got', () => ({
  default: {
    extend: vi.fn(() => vi.fn())
  }
}))

describe('spotifyClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a got client with shared Spotify defaults', async () => {
    const got = await import('got')
    const extendMock = got.default.extend

    await import('./spotify-client.js')

    expect(extendMock).toHaveBeenCalledWith({
      prefixUrl: 'https://api.spotify.com/v1',
      responseType: 'json',
      retry: {
        limit: 2,
        methods: ['GET'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED']
      }
    })
  })
})
