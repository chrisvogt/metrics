import { defineJsonSecret, defineSecret, defineString } from 'firebase-functions/params'
import type { StringParam } from 'firebase-functions/params'

import { applyExportedConfigToEnv } from '../config/exported-config.js'
import type { RuntimeConfigSource } from '../config/runtime-config.js'

const storageFirestoreDatabaseUrl: StringParam = defineString('STORAGE_FIRESTORE_DATABASE_URL')
const functionsConfigExport = defineJsonSecret('FUNCTIONS_CONFIG_EXPORT')

/** Binds Secret Manager secret INTEGRATION_TOKEN_MASTER_KEY → process.env in deployed functions. */
const integrationTokenMasterKeySecret = defineSecret('INTEGRATION_TOKEN_MASTER_KEY')

export const firebaseRuntimeConfigSource: RuntimeConfigSource<Record<string, unknown>> = {
  name: 'FUNCTIONS_CONFIG_EXPORT',
  load: () => functionsConfigExport.value() as Record<string, unknown>,
  applyToEnv: applyExportedConfigToEnv,
}

export const getFirebaseRuntimeSecrets = () => [
  functionsConfigExport,
  integrationTokenMasterKeySecret,
]

export const getFirebaseFirestoreDatabaseUrl = (): string =>
  typeof storageFirestoreDatabaseUrl === 'string'
    ? storageFirestoreDatabaseUrl
    : storageFirestoreDatabaseUrl.value()
