import { describe, expect, it, vi } from 'vitest'

import { connectFirebaseAdminEmulators } from './firebase-admin-emulators.js'

describe('connectFirebaseAdminEmulators', () => {
  it('connects auth and firestore emulators when available', () => {
    const authUseEmulator = vi.fn()
    const firestoreUseEmulator = vi.fn()
    const log = vi.fn()

    connectFirebaseAdminEmulators(
      {
        auth: () => ({ useEmulator: authUseEmulator }),
        firestore: () => ({ useEmulator: firestoreUseEmulator }),
      },
      log
    )

    expect(authUseEmulator).toHaveBeenCalledWith('http://127.0.0.1:9099')
    expect(firestoreUseEmulator).toHaveBeenCalledWith('127.0.0.1', 8080)
    expect(log).toHaveBeenCalledWith('Connected to Firebase Auth emulator')
    expect(log).toHaveBeenCalledWith('Connected to Firestore emulator')
  })

  it('logs fallback messages when emulator setup throws', () => {
    const log = vi.fn()

    connectFirebaseAdminEmulators(
      {
        auth: () => ({
          useEmulator: vi.fn(() => {
            throw new Error('already connected')
          }),
        }),
        firestore: () => ({
          useEmulator: vi.fn(() => {
            throw new Error('already connected')
          }),
        }),
      },
      log
    )

    expect(log).toHaveBeenCalledWith('Firebase Auth emulator already connected or not available')
    expect(log).toHaveBeenCalledWith('Firestore emulator already connected or not available')
  })
})
