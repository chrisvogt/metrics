import type { DocumentData } from '@google-cloud/firestore'

export interface DocumentStore {
  getDocument<T extends DocumentData>(path: string): Promise<T | null>
  setDocument(path: string, value: DocumentData): Promise<void>
  deleteDocument?(path: string): Promise<void>
  /** Legacy `users` documents that have `username` set but no `tenant_usernames` claim yet. */
  legacyUsernameClaimed?(usersCollection: string, usernameNormalized: string): Promise<boolean>
  /** Deletes a document and all subcollections (e.g. `users/{uid}`). */
  recursiveDeleteDocument?(path: string): Promise<void>
}
