import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('firebase-admin', () => ({
  default: { storage: vi.fn() },
  storage: vi.fn()
}))
vi.mock('https', () => ({
  default: { get: vi.fn() },
  get: vi.fn()
}))
vi.mock('../../lib/constants.js', () => ({
  CLOUD_STORAGE_IMAGES_BUCKET: 'test-bucket'
}))

let fetchAndUploadFile

describe('fetchAndUploadFile', () => {
  let mockStorage, mockBucket, mockFile, mockCreateWriteStream, mockHttpsGet

  beforeEach(async () => {
    fetchAndUploadFile = (await import('./fetch-and-upload-file.js')).default
    vi.clearAllMocks()
    mockCreateWriteStream = vi.fn()
    mockFile = vi.fn(() => ({ createWriteStream: mockCreateWriteStream }))
    mockBucket = vi.fn(() => ({ file: mockFile }))
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

  it('resolves with correct info on successful download/upload', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    const res = { headers: { 'content-type': 'image/jpeg' }, pipe: vi.fn() }
    const writeStream = {
      on: vi.fn((event, cb) => {
        if (event === 'finish') setTimeout(cb, 0)
        return writeStream
      })
    }
    mockCreateWriteStream.mockReturnValue(writeStream)
    mockHttpsGet.mockImplementation((url, cb) => {
      cb(res)
      return { on: vi.fn() }
    })

    const result = await fetchAndUploadFile({ destinationPath, mediaURL, id })
    expect(result).toEqual({ id, fileName: destinationPath })
    expect(res.pipe).toHaveBeenCalledWith(writeStream)
    expect(mockCreateWriteStream).toHaveBeenCalledWith({
      resumable: false,
      public: true,
      metadata: { contentType: 'image/jpeg' }
    })
  })

  it('rejects if mediaURL is missing', async () => {
    await expect(fetchAndUploadFile({ destinationPath: 'foo', id: 'bar' })).rejects.toMatch('Missing media to download for bar.')
  })

  it('rejects if download fails', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    mockHttpsGet.mockImplementation(() => {
      return { on: (event, cb2) => { if (event === 'error') setTimeout(() => cb2(new Error('fail-dl')), 0); return this } }
    })
    await expect(fetchAndUploadFile({ destinationPath, mediaURL, id })).rejects.toThrow('Failed to download media for media123: fail-dl')
  })

  it('rejects if upload fails', async () => {
    const destinationPath = 'media/test.jpg'
    const mediaURL = 'https://example.com/test.jpg'
    const id = 'media123'
    const res = { headers: {}, pipe: vi.fn() }
    const writeStream = {
      on: vi.fn((event, cb) => {
        if (event === 'error') setTimeout(() => cb(new Error('fail-up')), 0)
        return writeStream
      })
    }
    mockCreateWriteStream.mockReturnValue(writeStream)
    mockHttpsGet.mockImplementation((url, cb) => {
      cb(res)
      return { on: vi.fn() }
    })
    await expect(fetchAndUploadFile({ destinationPath, mediaURL, id })).rejects.toThrow('Failed to upload media/test.jpg: fail-up')
  })
}) 