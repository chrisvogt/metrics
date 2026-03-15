import path from 'path'

import { GcsMediaStore } from '../adapters/storage/gcs-media-store.js'
import { LocalDiskMediaStore } from '../adapters/storage/local-disk-media-store.js'
import type { MediaStore } from '../ports/media-store.js'

let defaultMediaStore: MediaStore | undefined

export const resolveMediaStoreBackend = () =>
  process.env.MEDIA_STORE_BACKEND ?? (process.env.NODE_ENV === 'production' ? 'gcs' : 'disk')

export const resolveLocalMediaRoot = () =>
  process.env.LOCAL_MEDIA_ROOT ?? path.resolve(process.cwd(), 'tmp/media')

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
