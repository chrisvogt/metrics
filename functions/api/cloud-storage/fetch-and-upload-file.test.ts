import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../selectors/media-store.js', () => ({
  getMediaStore: vi.fn(),
}))

let fetchAndUploadFile

describe('fetchAndUploadFile', () => {
  let getMediaStore
  let mediaStore

  beforeEach(async () => {
    fetchAndUploadFile = (await import('./fetch-and-upload-file.js')).default
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

  it('resolves with correct info on successful download/upload', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    vi.mocked(mediaStore.fetchAndStore).mockResolvedValue({ id, fileName: destinationPath })

    const result = await fetchAndUploadFile({ destinationPath, mediaURL, id })
    expect(result).toEqual({ id, fileName: destinationPath })
    expect(mediaStore.fetchAndStore).toHaveBeenCalledWith({
      destinationPath,
      id,
      mediaURL,
    })
  })

  it('rejects if mediaURL is missing', async () => {
    vi.mocked(mediaStore.fetchAndStore).mockRejectedValue(new Error('Missing media to download for bar.'))

    await expect(fetchAndUploadFile({ destinationPath: 'foo', id: 'bar' })).rejects.toThrow(
      'Missing media to download for bar.'
    )
  })

  it('rejects if download fails', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    vi.mocked(mediaStore.fetchAndStore).mockRejectedValue(new Error('Failed to download media for media123: fail-dl'))
    await expect(fetchAndUploadFile({ destinationPath, mediaURL, id })).rejects.toThrow('Failed to download media for media123: fail-dl')
  })

  it('rejects if upload fails', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    vi.mocked(mediaStore.fetchAndStore).mockRejectedValue(new Error('Failed to upload media/test.jpg: fail-up'))
    await expect(fetchAndUploadFile({ destinationPath, mediaURL, id })).rejects.toThrow('Failed to upload media/test.jpg: fail-up')
  })
})
