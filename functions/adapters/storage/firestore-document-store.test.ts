import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGet,
  mockSet,
  mockDelete,
  mockDoc,
  mockCollection,
  mockFirestore,
} = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  const mockDelete = vi.fn()
  const mockDoc = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  }))
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
  }))
  const mockFirestore = vi.fn(() => ({
    collection: mockCollection,
  }))

  return {
    mockGet,
    mockSet,
    mockDelete,
    mockDoc,
    mockCollection,
    mockFirestore,
  }
})

vi.mock('firebase-admin', () => ({
  default: {
    firestore: mockFirestore,
  },
}))

import { FirestoreDocumentStore, toCollectionAndDocument } from './firestore-document-store.js'

describe('FirestoreDocumentStore', () => {
  let adapter: FirestoreDocumentStore

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new FirestoreDocumentStore()
  })

  it('maps a document path to collection path and id', () => {
    expect(toCollectionAndDocument('users/chrisvogt/flickr/widget-content')).toEqual({
      collectionPath: 'users/chrisvogt/flickr',
      documentId: 'widget-content',
    })
  })

  it('writes documents using the current Firestore layout', async () => {
    await adapter.setDocument('users/chrisvogt/flickr/widget-content', { ok: true })

    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/flickr')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockSet).toHaveBeenCalledWith({ ok: true })
  })

  it('reads documents when they exist', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ ok: true }),
    })

    await expect(adapter.getDocument('users/chrisvogt/flickr/widget-content')).resolves.toEqual({
      ok: true,
    })
  })

  it('returns null when the document does not exist', async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    })

    await expect(adapter.getDocument('users/chrisvogt/flickr/widget-content')).resolves.toBeNull()
  })

  it('deletes documents using the current Firestore layout', async () => {
    await adapter.deleteDocument('users/chrisvogt/flickr/widget-content')

    expect(mockCollection).toHaveBeenCalledWith('users/chrisvogt/flickr')
    expect(mockDoc).toHaveBeenCalledWith('widget-content')
    expect(mockDelete).toHaveBeenCalled()
  })

  it('rejects invalid document paths', () => {
    expect(() => toCollectionAndDocument('users/chrisvogt/flickr')).toThrow(
      'Invalid document path: users/chrisvogt/flickr'
    )
  })
})
