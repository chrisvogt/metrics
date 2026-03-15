export type MediaDescriptor = {
  id: string
  destinationPath: string
  mediaURL?: string
}

export type StoredMedia = {
  id: string
  fileName: string
}

export interface MediaStore {
  listFiles(): Promise<string[]>
  fetchAndStore(media: MediaDescriptor): Promise<StoredMedia>
  describe(): {
    backend: string
    target: string
  }
}
