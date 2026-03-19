import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMediaStoreMock = vi.hoisted(() => vi.fn())

vi.mock('../../selectors/media-store.js', () => ({
  getMediaStore: getMediaStoreMock,
}))

describe('media-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.MEDIA_PUBLIC_BASE_URL
    delete process.env.IMAGE_CDN_BASE_URL
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

  it('delegates describeMediaStore to the selected media store', async () => {
    const mediaStore = {
      listFiles: vi.fn().mockResolvedValue(['one.jpg', 'two.jpg']),
      fetchAndStore: vi.fn().mockResolvedValue({ id: 'media-1', fileName: 'one.jpg' }),
      describe: vi.fn().mockReturnValue({ backend: 'disk', target: '/tmp' }),
    }
    getMediaStoreMock.mockReturnValue(mediaStore)

    const { describeMediaStore } = await import('./media-service.js')

    expect(describeMediaStore()).toEqual({ backend: 'disk', target: '/tmp' })
    expect(mediaStore.describe).toHaveBeenCalledOnce()
  })

  it('uses configured media service when configureMediaService is called', async () => {
    const { configureMediaService, describeMediaStore, listStoredMedia } = await import('./media-service.js')

    const configuredService = {
      describe: vi.fn().mockReturnValue({ backend: 'configured', target: 'x' }),
      listStoredMedia: vi.fn().mockResolvedValue(['configured.jpg']),
      storeRemoteMedia: vi.fn().mockResolvedValue({ id: 'configured', fileName: 'configured.jpg' }),
      toPublicMediaUrl: vi.fn().mockReturnValue('/public/configured.jpg'),
    }

    configureMediaService(configuredService)

    expect(getMediaStoreMock).not.toHaveBeenCalled()
    expect(describeMediaStore()).toEqual({ backend: 'configured', target: 'x' })
    await expect(listStoredMedia()).resolves.toEqual(['configured.jpg'])

    expect(configuredService.describe).toHaveBeenCalledOnce()
    expect(configuredService.listStoredMedia).toHaveBeenCalledOnce()
  })

  it('returns a public URL when MEDIA_PUBLIC_BASE_URL is configured', async () => {
    process.env.MEDIA_PUBLIC_BASE_URL = '/api/media/'

    const { toPublicMediaUrl } = await import('./media-service.js')

    expect(toPublicMediaUrl('nested/file.jpg')).toBe('/api/media/nested/file.jpg')
  })

  it('returns the original path when no public media base URL is configured', async () => {
    const { toPublicMediaUrl } = await import('./media-service.js')

    expect(toPublicMediaUrl('nested/file.jpg')).toBe('nested/file.jpg')
  })
})
