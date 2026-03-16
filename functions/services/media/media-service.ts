import { MEDIA_PUBLIC_BASE_URL } from '../../config/constants.js'
import type { MediaDescriptor } from '../../ports/media-store.js'
import { getMediaStore } from '../../selectors/media-store.js'

export const listStoredMedia = async (): Promise<string[]> => getMediaStore().listFiles()

export const storeRemoteMedia = async (media: MediaDescriptor) =>
  getMediaStore().fetchAndStore(media)

export const toPublicMediaUrl = (mediaPath: string): string =>
  MEDIA_PUBLIC_BASE_URL ? `${MEDIA_PUBLIC_BASE_URL}${mediaPath}` : mediaPath
