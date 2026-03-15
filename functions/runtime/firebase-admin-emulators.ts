interface FirebaseAdminAuthLike {
  useEmulator?: (url: string) => void
}

interface FirebaseAdminFirestoreLike {
  useEmulator?: (host: string, port: number) => void
}

interface FirebaseAdminLike {
  auth: () => FirebaseAdminAuthLike
  firestore: () => FirebaseAdminFirestoreLike
}

type EmulatorLog = (message: string) => void

export const connectFirebaseAdminEmulators = (
  admin: FirebaseAdminLike,
  log: EmulatorLog
): void => {
  try {
    admin.auth().useEmulator?.('http://127.0.0.1:9099')
    log('Connected to Firebase Auth emulator')
  } catch {
    log('Firebase Auth emulator already connected or not available')
  }

  try {
    admin.firestore().useEmulator?.('127.0.0.1', 8080)
    log('Connected to Firestore emulator')
  } catch {
    log('Firestore emulator already connected or not available')
  }
}
