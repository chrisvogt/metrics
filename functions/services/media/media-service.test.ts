import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMediaStoreMock = vi.hoisted(() => vi.fn())

vi.mock('../../selectors/media-store.js', () => ({
  getMediaStore: getMediaStoreMock,
}))

describe('media-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('delegates list and store operations to the selected media store', async () => {
    const mediaStore = {
      listFiles: vi.fn().mockResolvedValue(['one.jpg', 'two.jpg']),
      fetchAndStore: vi.fn().mockResolvedValue({ id: 'media-1', fileName: 'one.jpg' }),
    }
    getMediaStoreMock.mockReturnValue(mediaStore)

    const { listStoredMedia, storeRemoteMedia } = await import('./media-service.js')

    await expect(listStoredMedia()).resolves.toEqual(['one.jpg', 'two.jpg'])
    await expect(
      storeRemoteMedia({
        destinationPath: 'one.jpg',
        id: 'media-1',
        mediaURL: 'https://example.com/one.jpg',
      })
    ).resolves.toEqual({ id: 'media-1', fileName: 'one.jpg' })

    expect(mediaStore.listFiles).toHaveBeenCalledOnce()
    expect(mediaStore.fetchAndStore).toHaveBeenCalledWith({
      destinationPath: 'one.jpg',
      id: 'media-1',
      mediaURL: 'https://example.com/one.jpg',
    })
  })

  it('returns a public URL when MEDIA_PUBLIC_BASE_URL is configured', async () => {
    vi.doMock('../../config/constants.js', () => ({
      MEDIA_PUBLIC_BASE_URL: '/api/media/',
    }))

    const { toPublicMediaUrl } = await import('./media-service.js')

    expect(toPublicMediaUrl('nested/file.jpg')).toBe('/api/media/nested/file.jpg')
  })

  it('returns the original path when no public media base URL is configured', async () => {
    vi.doMock('../../config/constants.js', () => ({
      MEDIA_PUBLIC_BASE_URL: undefined,
    }))

    const { toPublicMediaUrl } = await import('./media-service.js')

    expect(toPublicMediaUrl('nested/file.jpg')).toBe('nested/file.jpg')
  })
})
