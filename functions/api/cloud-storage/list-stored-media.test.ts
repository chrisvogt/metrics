import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../selectors/media-store.js', () => ({
  getMediaStore: vi.fn(),
}))

let listStoredMedia

describe('listStoredMedia', () => {
  let getMediaStore
  let mediaStore

  beforeEach(async () => {
    listStoredMedia = (await import('./list-stored-media.js')).default
    getMediaStore = (await import('../../selectors/media-store.js')).getMediaStore
    vi.clearAllMocks()
    mediaStore = {
      fetchAndStore: vi.fn(),
      listFiles: vi.fn(),
      describe: vi.fn(),
    }
    vi.mocked(getMediaStore).mockReturnValue(mediaStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a list of file names from the bucket', async () => {
    vi.mocked(mediaStore.listFiles).mockResolvedValue(['foo.jpg', 'bar.jpg'])
    const result = await listStoredMedia()
    expect(result).toEqual(['foo.jpg', 'bar.jpg'])
    expect(mediaStore.listFiles).toHaveBeenCalled()
  })

  it('returns an empty list if no files are present', async () => {
    vi.mocked(mediaStore.listFiles).mockResolvedValue([])
    const result = await listStoredMedia()
    expect(result).toEqual([])
  })

  it('re-exports listStoredMedia from media-service', async () => {
    const handler = (await import('./list-stored-media.js')).default
    const { listStoredMedia: fromService } = await import('../../services/media/media-service.js')
    expect(handler).toBe(fromService)
  })
})
