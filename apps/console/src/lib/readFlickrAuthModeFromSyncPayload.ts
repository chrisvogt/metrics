export type FlickrAuthMode = 'env' | 'oauth'

export function readFlickrAuthModeFromSyncPayload(data: unknown): FlickrAuthMode | undefined {
  if (!data || typeof data !== 'object') return undefined
  const worker = (data as { worker?: { flickrAuthMode?: unknown } }).worker
  const mode = worker?.flickrAuthMode
  return mode === 'oauth' || mode === 'env' ? mode : undefined
}
