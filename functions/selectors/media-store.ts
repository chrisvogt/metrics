import { GcsMediaStore } from '../adapters/storage/gcs-media-store.js'
import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'
import { getStorageConfig } from '../config/backend-config.js'
import type { MediaStore } from '../ports/media-store.js'

let defaultMediaStore: MediaStore | undefined

export const resolveMediaStoreBackend = () =>
  getStorageConfig().mediaStoreBackend

export const resolveLocalMediaRoot = () =>
  getStorageConfig().localMediaRoot

export const isDiskMediaStoreSelected = () => resolveMediaStoreBackend() === 'disk'

export const getMediaStore = (): MediaStore => {
  if (!defaultMediaStore) {
    const backend = resolveMediaStoreBackend()

    switch (backend) {
    case 'disk':
      defaultMediaStore = new LocalDiskMediaStore(resolveLocalMediaRoot())
      break
    case 'gcs':
      defaultMediaStore = new GcsMediaStore()
      break
    default:
      throw new Error(`Unsupported media store backend: ${backend}`)
    }
  }

  return defaultMediaStore
}

export const resetMediaStoreForTests = () => {
  defaultMediaStore = undefined
}
