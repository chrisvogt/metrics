import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase-admin', () => ({
  default: { storage: vi.fn() },
  storage: vi.fn(),
}))

vi.mock('https', () => ({
  default: { get: vi.fn() },
  get: vi.fn(),
}))

vi.mock('../../config/backend-config.js', () => ({
  getStorageConfig: vi.fn(() => ({ cloudStorageImagesBucket: 'test-bucket' })),
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

  it('defaults content-type when the response omits it', async () => {
    const response = { headers: {}, pipe: vi.fn() }
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
        destinationPath: 'media/no-ct.jpg',
        id: 'media-no-ct',
        mediaURL: 'https://example.com/no-ct.jpg',
      }),
    ).resolves.toEqual({
      id: 'media-no-ct',
      fileName: 'media/no-ct.jpg',
    })

    expect(mockCreateWriteStream).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { contentType: 'application/octet-stream' },
      }),
    )
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

  it('rejects when the write stream errors', async () => {
    const response = { headers: { 'content-type': 'image/jpeg' }, pipe: vi.fn() }
    const writeStream = {
      on: vi.fn((event: string, callback: (err?: Error) => void) => {
        if (event === 'error') {
          queueMicrotask(() => callback(new Error('upload boom')))
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
        destinationPath: 'media/bad.jpg',
        id: 'media123',
        mediaURL: 'https://example.com/bad.jpg',
      }),
    ).rejects.toThrow('Failed to upload media/bad.jpg: upload boom')
  })

  it('rejects when the HTTPS client errors before the response', async () => {
    mockHttpsGet.mockImplementation(() => ({
      on(event: string, cb: (err: Error) => void) {
        if (event === 'error') {
          queueMicrotask(() => cb(new Error('socket fail')))
        }
        return this
      },
    }))

    await expect(
      adapter.fetchAndStore({
        destinationPath: 'media/nope.jpg',
        id: 'media456',
        mediaURL: 'https://example.com/nope.jpg',
      }),
    ).rejects.toThrow('Failed to download media for media456: socket fail')
  })

  it('throws when bucket is not configured', async () => {
    const { getStorageConfig } = await import('../../config/backend-config.js')
    vi.mocked(getStorageConfig).mockReturnValueOnce({
      cloudStorageImagesBucket: undefined,
      imageCdnBaseUrl: undefined,
      localMediaRoot: '/tmp',
      mediaPublicBaseUrl: undefined,
      mediaStoreBackend: 'gcs',
    } as ReturnType<typeof getStorageConfig>)

    const adapterWithNoBucket = new GcsMediaStore()
    await expect(adapterWithNoBucket.listFiles()).rejects.toThrow(
      'Bucket name not specified or invalid. Set storage.cloud_storage_images_bucket in FUNCTIONS_CONFIG_EXPORT secret.'
    )
  })
})
