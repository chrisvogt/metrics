export type DiscogsAuthMode = 'env' | 'oauth'

export function readDiscogsAuthModeFromSyncPayload(data: unknown): DiscogsAuthMode | undefined {
  if (!data || typeof data !== 'object') return undefined
  const worker = (data as { worker?: { discogsAuthMode?: unknown } }).worker
  const mode = worker?.discogsAuthMode
  return mode === 'oauth' || mode === 'env' ? mode : undefined
}
