import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWidgetContent, validWidgetIds } from './get-widget-content.js'

// Mock all widget content functions
vi.mock('./get-discogs-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-github-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-goodreads-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-instagram-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-spotify-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-steam-widget-content.js', () => ({
  default: vi.fn()
}))

vi.mock('./get-flickr-widget-content.js', () => ({
  default: vi.fn()
}))

import getDiscogsWidgetContent from './get-discogs-widget-content.js'
import getGitHubWidgetContent from './get-github-widget-content.js'
import getGoodreadsWidgetContent from './get-goodreads-widget-content.js'
import getInstagramWidgetContent from './get-instagram-widget-content.js'
import getSpotifyWidgetContent from './get-spotify-widget-content.js'
import getSteamWidgetContent from './get-steam-widget-content.js'
import getFlickrWidgetContent from './get-flickr-widget-content.js'

describe('getWidgetContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return valid widget IDs', () => {
    expect(validWidgetIds).toEqual([
      'discogs',
      'github', 
      'goodreads',
      'instagram',
      'spotify',
      'steam',
      'flickr'
    ])
  })

  it('should call discogs widget content function', async () => {
    const mockContent = { collections: { releases: [] } }
    getDiscogsWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('discogs', 'user123')

    expect(getDiscogsWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call github widget content function', async () => {
    const mockContent = { repositories: [] }
    getGitHubWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('github', 'user123')

    expect(getGitHubWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call goodreads widget content function', async () => {
    const mockContent = { collections: { recentlyReadBooks: [] } }
    getGoodreadsWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('goodreads', 'user123')

    expect(getGoodreadsWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call instagram widget content function', async () => {
    const mockContent = { collections: { media: [] } }
    getInstagramWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('instagram', 'user123')

    expect(getInstagramWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call spotify widget content function', async () => {
    const mockContent = { collections: { topTracks: [] } }
    getSpotifyWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('spotify', 'user123')

    expect(getSpotifyWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call steam widget content function', async () => {
    const mockContent = { collections: { recentlyPlayedGames: [] } }
    getSteamWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('steam', 'user123')

    expect(getSteamWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should call flickr widget content function', async () => {
    const mockContent = { collections: { photos: [] } }
    getFlickrWidgetContent.mockResolvedValue(mockContent)

    const result = await getWidgetContent('flickr', 'user123')

    expect(getFlickrWidgetContent).toHaveBeenCalledWith('user123')
    expect(result).toEqual(mockContent)
  })

  it('should throw error for unrecognized widget type', async () => {
    await expect(getWidgetContent('invalid', 'user123')).rejects.toThrow(
      'Unrecognized widget type: invalid'
    )
  })
}) 