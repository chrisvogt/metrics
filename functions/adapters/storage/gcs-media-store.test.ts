import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase-admin', () => ({
  default: { storage: vi.fn() },
  storage: vi.fn(),
}))

vi.mock('https', () => ({
  default: { get: vi.fn() },
  get: vi.fn(),
}))

vi.mock('../../config/constants.js', () => ({
  CLOUD_STORAGE_IMAGES_BUCKET: 'test-bucket',
}))

import { GcsMediaStore } from './gcs-media-store.js'

describe('GcsMediaStore', () => {
  let adapter: GcsMediaStore
  let mockStorage
  let mockBucket
  let mockFile
  let mockCreateWriteStream
  let mockGetFiles
  let mockHttpsGet

  beforeEach(async () => {
    vi.clearAllMocks()

    adapter = new GcsMediaStore()
    mockCreateWriteStream = vi.fn()
    mockFile = vi.fn(() => ({ createWriteStream: mockCreateWriteStream }))
    mockGetFiles = vi.fn()
    mockBucket = vi.fn(() => ({ file: mockFile, getFiles: mockGetFiles }))
    mockStorage = vi.fn(() => ({ bucket: mockBucket }))

    const admin = await import('firebase-admin')
    admin.default.storage.mockImplementation(mockStorage)
    admin.storage.mockImplementation(mockStorage)

    const https = await import('https')
    https.default.get.mockImplementation(https.get)
    mockHttpsGet = https.get
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists files from the bucket', async () => {
    mockGetFiles.mockResolvedValue([[{ name: 'foo.jpg' }, { name: 'bar.jpg' }]])

    await expect(adapter.listFiles()).resolves.toEqual(['foo.jpg', 'bar.jpg'])
    expect(mockBucket).toHaveBeenCalledWith('test-bucket')
  })

  it('uploads downloaded media to the bucket', async () => {
    const response = { headers: { 'content-type': 'image/jpeg' }, pipe: vi.fn() }
    const writeStream = {
      on: vi.fn((event, callback) => {
        if (event === 'finish') {
          setTimeout(callback, 0)
        }
        return writeStream
      }),
    }

    mockCreateWriteStream.mockReturnValue(writeStream)
    mockHttpsGet.mockImplementation((_url, callback) => {
      callback(response)
      return { on: vi.fn() }
    })

    await expect(
      adapter.fetchAndStore({
        destinationPath: 'media/test.jpg',
        id: 'media123',
        mediaURL: 'https://example.com/test.jpg',
      })
    ).resolves.toEqual({
      id: 'media123',
      fileName: 'media/test.jpg',
    })

    expect(response.pipe).toHaveBeenCalledWith(writeStream)
  })

  it('rejects when mediaURL is missing', async () => {
    await expect(
      adapter.fetchAndStore({ destinationPath: 'media/test.jpg', id: 'media123' })
    ).rejects.toThrow('Missing media to download for media123.')
  })

  it('describes the configured backend', () => {
    expect(adapter.describe()).toEqual({
      backend: 'gcs',
      target: 'test-bucket',
    })
  })
})
