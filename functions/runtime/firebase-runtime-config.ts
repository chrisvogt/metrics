import { defineJsonSecret, defineString } from 'firebase-functions/params'

import { applyExportedConfigToEnv } from '../config/exported-config.js'
import type { RuntimeConfigSource } from '../config/runtime-config.js'

const storageFirestoreDatabaseUrl = defineString('STORAGE_FIRESTORE_DATABASE_URL')
const functionsConfigExport = defineJsonSecret('FUNCTIONS_CONFIG_EXPORT')

export const firebaseRuntimeConfigSource: RuntimeConfigSource<Record<string, unknown>> = {
  name: 'FUNCTIONS_CONFIG_EXPORT',
  load: () => functionsConfigExport.value() as Record<string, unknown>,
  applyToEnv: applyExportedConfigToEnv,
}

export const getFirebaseRuntimeSecrets = () => [functionsConfigExport]

export const getFirebaseFirestoreDatabaseUrl = (): string =>
  storageFirestoreDatabaseUrl as unknown as string
