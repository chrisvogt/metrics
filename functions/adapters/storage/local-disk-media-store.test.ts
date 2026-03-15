import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { Readable } from 'stream'

vi.mock('https', () => ({
  default: { get: vi.fn() },
  get: vi.fn(),
}))

import { LocalDiskMediaStore } from './local-disk-media-store.js'

describe('LocalDiskMediaStore', () => {
  let rootDirectory: string
  let adapter: LocalDiskMediaStore
  let mockHttpsGet

  beforeEach(async () => {
    vi.clearAllMocks()
    rootDirectory = mkdtempSync(path.join(tmpdir(), 'metrics-media-'))
    adapter = new LocalDiskMediaStore(rootDirectory)

    const https = await import('https')
    https.default.get.mockImplementation(https.get)
    mockHttpsGet = https.get
  })

  afterEach(() => {
    rmSync(rootDirectory, { force: true, recursive: true })
    vi.restoreAllMocks()
  })

  it('returns an empty list when the root directory has no files', async () => {
    await expect(adapter.listFiles()).resolves.toEqual([])
  })

  it('writes downloaded media to disk and lists it', async () => {
    mockHttpsGet.mockImplementation((_url, callback) => {
      const response = new Readable({
        read() {
          this.push('hello world')
          this.push(null)
        },
      })
      callback(response)
      return { on: vi.fn() }
    })

    await expect(
      adapter.fetchAndStore({
        destinationPath: 'nested/test.txt',
        id: 'media123',
        mediaURL: 'https://example.com/test.txt',
      })
    ).resolves.toEqual({
      id: 'media123',
      fileName: 'nested/test.txt',
    })

    const absolutePath = path.join(rootDirectory, 'nested/test.txt')
    expect(existsSync(absolutePath)).toBe(true)
    expect(readFileSync(absolutePath, 'utf8')).toBe('hello world')
    await expect(adapter.listFiles()).resolves.toEqual(['nested/test.txt'])
  })

  it('describes the configured backend', () => {
    expect(adapter.describe()).toEqual({
      backend: 'disk',
      target: rootDirectory,
    })
  })

  it('resolves absolute paths inside the root directory', () => {
    expect(adapter.resolveAbsolutePath('../nested/test.txt')).toBe(
      path.join(rootDirectory, 'nested/test.txt')
    )
  })
})
