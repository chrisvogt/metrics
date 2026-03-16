import { beforeEach, describe, expect, it, vi } from 'vitest'

const { serviceMock, storeInstances } = vi.hoisted(() => {
  const serviceMock = vi.fn()
  const storeInstances: Array<{ getDocument: ReturnType<typeof vi.fn>; setDocument: ReturnType<typeof vi.fn> }> = []

  return {
    serviceMock,
    storeInstances,
  }
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

vi.mock('../services/sync/sync-flickr-data.js', () => ({
  default: serviceMock,
}))

describe('syncFlickrData boundary wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeInstances.length = 0
  })

  it('uses the default FirestoreDocumentStore when no store is provided', async () => {
    serviceMock.mockResolvedValue({ result: 'SUCCESS' })

    const { default: syncFlickrData } = await import('./sync-flickr-data.js')

    await expect(syncFlickrData()).resolves.toEqual({ result: 'SUCCESS' })
    expect(storeInstances).toHaveLength(1)
    expect(serviceMock).toHaveBeenCalledWith(storeInstances[0])
  })

  it('passes an injected DocumentStore through to the shared sync service', async () => {
    serviceMock.mockResolvedValue({ result: 'SUCCESS' })
    const injectedStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }

    const { default: syncFlickrData } = await import('./sync-flickr-data.js')

    await expect(syncFlickrData(injectedStore)).resolves.toEqual({ result: 'SUCCESS' })
    expect(serviceMock).toHaveBeenCalledWith(injectedStore)
  })
})
