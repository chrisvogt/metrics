import { existsSync, readFileSync } from 'fs'

import type admin from 'firebase-admin'

import { connectFirebaseAdminEmulators } from './firebase-admin-emulators.js'

type FirebaseAdminModule = Pick<
  typeof admin,
  'auth' | 'firestore' | 'initializeApp' | 'credential'
>

interface FirebaseAdminRuntimeOptions {
  admin: FirebaseAdminModule
  databaseURL: string
  isProduction: boolean
  projectId: string
  log?: (message: string) => void
  tokenPath?: string
}

export function getFirebaseAdminCredential(
  adminModule: FirebaseAdminModule,
  isProduction: boolean,
  tokenPath = './token.json'
): admin.credential.Credential {
  if (isProduction) {
    return adminModule.credential.applicationDefault()
  }

  if (existsSync(tokenPath)) {
    return adminModule.credential.cert(
      JSON.parse(readFileSync(tokenPath, 'utf8')) as admin.ServiceAccount
    )
  }

  return adminModule.credential.applicationDefault()
}

export function initializeFirebaseAdminRuntime({
  admin,
  databaseURL,
  isProduction,
  projectId,
  log = console.log,
  tokenPath = './token.json',
}: FirebaseAdminRuntimeOptions): void {
  admin.initializeApp({
    credential: getFirebaseAdminCredential(admin, isProduction, tokenPath),
    databaseURL,
    projectId,
  })

  if (!isProduction) {
    connectFirebaseAdminEmulators(
      admin as Parameters<typeof connectFirebaseAdminEmulators>[0],
      log
    )
  }

  admin.firestore().settings({
    ignoreUndefinedProperties: true,
  })
}
