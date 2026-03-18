import type { DocumentData } from '@google-cloud/firestore'

export interface DocumentStore {
  getDocument<T extends DocumentData>(path: string): Promise<T | null>
  setDocument(path: string, value: DocumentData): Promise<void>
  deleteDocument?(path: string): Promise<void>
}
