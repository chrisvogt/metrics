import { beforeEach, describe, expect, it, vi } from 'vitest'

const { storeInstances } = vi.hoisted(() => {
  const storeInstances: Array<{ getDocument: ReturnType<typeof vi.fn>; setDocument: ReturnType<typeof vi.fn> }> = []
  return { storeInstances }
})

vi.mock('../adapters/storage/firestore-document-store.js', () => ({
  FirestoreDocumentStore: vi.fn().mockImplementation(class MockFirestoreDocumentStore {
    getDocument = vi.fn()

    setDocument = vi.fn()

    constructor() {
      storeInstances.push(this)
    }
  }),
}))

vi.mock('../config/backend-paths.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/backend-paths.js')>()
  return {
    ...actual,
    getDefaultWidgetUserId: vi.fn(() => 'default-user'),
  }
})

describe('getSpotifyWidgetContent default boundary wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeInstances.length = 0
  })

  it('uses the default FirestoreDocumentStore and default widget user id when no arguments are provided', async () => {
    const { default: getSpotifyWidgetContent } = await import('./get-spotify-widget-content.js')

    expect(storeInstances).toHaveLength(1)
    storeInstances[0].getDocument.mockResolvedValue({
      collections: { topTracks: [] },
      meta: {},
    })

    await expect(getSpotifyWidgetContent()).resolves.toEqual({
      collections: { topTracks: [] },
      meta: {
        synced: new Date(0),
      },
    })

    expect(storeInstances[0].getDocument).toHaveBeenCalledWith(
      'users/default-user/spotify/widget-content'
    )
  })
})
