import type { MediaDescriptor, MediaStore } from '../../ports/media-store.js'

export interface MediaService {
  describe: () => { backend: string; target: string }
  listStoredMedia: () => Promise<string[]>
  storeRemoteMedia: (media: MediaDescriptor) => Promise<{ id: string; fileName: string }>
  toPublicMediaUrl: (mediaPath: string) => string
}

export const createMediaService = (
  mediaStore: MediaStore,
  mediaPublicBaseUrl?: string
): MediaService => ({
  describe: () => mediaStore.describe(),
  listStoredMedia: () => mediaStore.listFiles(),
  storeRemoteMedia: (media) => mediaStore.fetchAndStore(media),
  toPublicMediaUrl: (mediaPath) =>
    mediaPublicBaseUrl ? `${mediaPublicBaseUrl}${mediaPath}` : mediaPath,
})

let configuredMediaService: MediaService | undefined

export const configureMediaService = (mediaService: MediaService) => {
  configuredMediaService = mediaService
}

const getConfiguredMediaService = (): MediaService => {
  if (!configuredMediaService) {
    throw new Error('Media service has not been configured')
  }

  return configuredMediaService
}

export const listStoredMedia = async (): Promise<string[]> =>
  getConfiguredMediaService().listStoredMedia()

export const describeMediaStore = () => getConfiguredMediaService().describe()

export const storeRemoteMedia = async (media: MediaDescriptor) =>
  getConfiguredMediaService().storeRemoteMedia(media)

export const toPublicMediaUrl = (mediaPath: string): string =>
  getConfiguredMediaService().toPublicMediaUrl(mediaPath)
