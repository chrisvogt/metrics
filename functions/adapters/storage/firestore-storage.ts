import admin from 'firebase-admin'

import type { StoragePort } from '../../ports/storage.js'

function toCollectionAndDocument(path: string): { collectionPath: string; documentId: string } {
  const segments = path.split('/').filter(Boolean)

  if (segments.length < 2 || segments.length % 2 !== 0) {
    throw new Error(`Invalid document path: ${path}`)
  }

  return {
    collectionPath: segments.slice(0, -1).join('/'),
    documentId: segments.at(-1)!,
  }
}

export class FirestoreStorageAdapter implements StoragePort {
  async getDocument<T>(path: string): Promise<T | null> {
    const { collectionPath, documentId } = toCollectionAndDocument(path)
    const snapshot = await admin.firestore().collection(collectionPath).doc(documentId).get()

    if (!snapshot.exists) {
      return null
    }

    return snapshot.data() as T
  }

  async setDocument(path: string, value: unknown): Promise<void> {
    const { collectionPath, documentId } = toCollectionAndDocument(path)

    await admin.firestore().collection(collectionPath).doc(documentId).set(value)
  }

  async deleteDocument(path: string): Promise<void> {
    const { collectionPath, documentId } = toCollectionAndDocument(path)

    await admin.firestore().collection(collectionPath).doc(documentId).delete()
  }
}

export { toCollectionAndDocument }
