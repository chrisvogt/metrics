export interface DocumentStore {
  getDocument<T>(path: string): Promise<T | null>
  setDocument(path: string, value: unknown): Promise<void>
  deleteDocument?(path: string): Promise<void>
}
