import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase-admin', () => ({
  default: { storage: vi.fn() },
  storage: vi.fn()
}))
vi.mock('../../constants.js', () => ({
  CLOUD_STORAGE_IMAGES_BUCKET: 'test-bucket'
}))

let listStoredMedia

describe('listStoredMedia', () => {
  let mockStorage, mockBucket, mockGetFiles

  beforeEach(async () => {
    listStoredMedia = (await import('./list-stored-media.js')).default
    vi.clearAllMocks()
    mockGetFiles = vi.fn()
    mockBucket = vi.fn(() => ({ getFiles: mockGetFiles }))
    mockStorage = vi.fn(() => ({ bucket: mockBucket }))
    const admin = await import('firebase-admin')
    admin.default.storage.mockImplementation(mockStorage)
    admin.storage.mockImplementation(mockStorage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a list of file names from the bucket', async () => {
    const files = [ { name: 'foo.jpg' }, { name: 'bar.jpg' } ]
    mockGetFiles.mockResolvedValue([files])
    const result = await listStoredMedia()
    expect(result).toEqual(['foo.jpg', 'bar.jpg'])
    expect(mockGetFiles).toHaveBeenCalled()
  })

  it('returns an empty list if no files are present', async () => {
    mockGetFiles.mockResolvedValue([[]])
    const result = await listStoredMedia()
    expect(result).toEqual([])
  })
}) 