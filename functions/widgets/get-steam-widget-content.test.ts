import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import getSteamWidgetContent from './get-steam-widget-content.js'

describe('getSteamWidgetContent', () => {
  let documentStore: DocumentStore

  beforeEach(() => {
    vi.resetModules()
    delete process.env.WIDGET_DATA_SOURCE_BY_PROVIDER
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }
  })

  it('should return properly formatted widget content', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      meta: {
        synced: {
          _seconds: 1640995200,
          _nanoseconds: 0,
        },
      },
      collections: {
        recentlyPlayedGames: [{ id: 1, name: 'Half-Life' }],
      },
      metrics: [{ displayName: 'Games', id: 'owned-games', value: 42 }],
    })

    const result = await getSteamWidgetContent('chrisvogt', documentStore)

    expect(result).toEqual({
      collections: {
        recentlyPlayedGames: [{ id: 1, name: 'Half-Life' }],
      },
      metrics: [{ displayName: 'Games', id: 'owned-games', value: 42 }],
      meta: {
        synced: new Date('2022-01-01T00:00:00.000Z'),
      },
    })

    expect(documentStore.getDocument).toHaveBeenCalledWith('users/chrisvogt/steam/widget-content')
  })

  it('should return the default synced date when no document exists', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue(null)

    const result = await getSteamWidgetContent('chrisvogt', documentStore)

    expect(result).toEqual({
      meta: { synced: new Date(0) },
    })
  })

  it('should default the synced date when metadata is missing', async () => {
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      collections: {
        recentlyPlayedGames: [],
      },
    })

    const result = await getSteamWidgetContent('chrisvogt', documentStore)

    expect(result).toEqual({
      collections: {
        recentlyPlayedGames: [],
      },
      meta: {
        synced: new Date(0),
      },
    })
  })

  it('should read from shadow widget content paths when Steam is switched over', async () => {
    process.env.WIDGET_DATA_SOURCE_BY_PROVIDER = 'steam=shadow'
    vi.mocked(documentStore.getDocument).mockResolvedValue({
      meta: {
        synced: {
          _seconds: 1640995200,
          _nanoseconds: 0,
        },
      },
    })

    const { default: getSteamWidgetContentWithShadow } = await import('./get-steam-widget-content.js')
    await getSteamWidgetContentWithShadow('chrisvogt', documentStore)

    expect(documentStore.getDocument).toHaveBeenCalledWith(
      'users/chrisvogt/steam_tmp/widget-content'
    )
  })
})
