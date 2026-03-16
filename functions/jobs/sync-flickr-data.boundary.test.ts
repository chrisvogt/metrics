import { beforeEach, describe, expect, it, vi } from 'vitest'

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: vi.fn(),
}))

vi.mock('../services/sync/sync-flickr-data.js', () => ({
  default: serviceMock,
}))

describe('syncFlickrData boundary wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
