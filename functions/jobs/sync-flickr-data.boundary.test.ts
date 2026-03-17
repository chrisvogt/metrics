import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/flickr/fetch-photos.js', () => ({
  default: vi.fn(),
}))

describe('syncFlickrData boundary wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the injected DocumentStore when performing the sync', async () => {
    const injectedStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }
    const { default: fetchPhotos } = await import('../api/flickr/fetch-photos.js')
    vi.mocked(fetchPhotos).mockResolvedValue({ total: 0, photos: [] })

    const { default: syncFlickrData } = await import('./sync-flickr-data.js')

    await expect(syncFlickrData(injectedStore)).resolves.toEqual({
      result: 'SUCCESS',
      widgetContent: expect.any(Object),
    })
    expect(injectedStore.setDocument).toHaveBeenCalled()
  })
})
