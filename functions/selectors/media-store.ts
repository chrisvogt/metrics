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
    defaultMediaStore = isDiskMediaStoreSelected()
      ? new LocalDiskMediaStore(resolveLocalMediaRoot())
      : new GcsMediaStore()
  }

  return defaultMediaStore
}

export const resetMediaStoreForTests = () => {
  defaultMediaStore = undefined
}
