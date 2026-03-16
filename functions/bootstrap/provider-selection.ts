import { isProductionEnvironment } from '../config/backend-config.js'

export type AuthProvider = 'firebase'
export type DocumentStoreProvider = 'firestore'
export type ConfigProvider = 'firebase'
export type RuntimePlatformProvider = 'firebase'
export type MediaStoreProvider = 'disk' | 'gcs'

export interface SelectedProviders {
  authProvider: AuthProvider
  configProvider: ConfigProvider
  documentStoreProvider: DocumentStoreProvider
  mediaStoreProvider: MediaStoreProvider
  runtimePlatformProvider: RuntimePlatformProvider
}

const readProvider = <TProvider extends string>(
  envName: string,
  fallback: TProvider,
  supportedProviders: readonly TProvider[]
): TProvider => {
  const value = process.env[envName]
  if (!value) {
    return fallback
  }

  if ((supportedProviders as readonly string[]).includes(value)) {
    return value as TProvider
  }

  throw new Error(
    `Unsupported ${envName} value: ${value}. Supported values: ${supportedProviders.join(', ')}`
  )
}

export const getSelectedProviders = (): SelectedProviders => ({
  authProvider: readProvider('AUTH_PROVIDER', 'firebase', ['firebase'] as const),
  configProvider: readProvider('CONFIG_PROVIDER', 'firebase', ['firebase'] as const),
  documentStoreProvider: readProvider(
    'DOCUMENT_STORE_PROVIDER',
    'firestore',
    ['firestore'] as const
  ),
  mediaStoreProvider: readProvider(
    'MEDIA_STORE_PROVIDER',
    isProductionEnvironment() ? 'gcs' : 'disk',
    ['disk', 'gcs'] as const
  ),
  runtimePlatformProvider: readProvider(
    'RUNTIME_PLATFORM',
    'firebase',
    ['firebase'] as const
  ),
})
