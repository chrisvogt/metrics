import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGet,
  mockSet,
  mockDelete,
  mockDoc,
  mockCollection,
  mockFirestore,
  mockWhereLimitGet,
  mockRecursiveDelete,
} = vi.hoisted(() => {
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  const mockDelete = vi.fn()
  const mockWhereLimitGet = vi.fn()
  const mockRecursiveDelete = vi.fn().mockResolvedValue(undefined)
  const mockDoc = vi.fn(() => ({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  }))
  const mockCollection = vi.fn(() => ({
    doc: mockDoc,
    where: vi.fn(() => ({
      limit: vi.fn(() => ({
        get: mockWhereLimitGet,
      })),
    })),
  }))
  const mockFirestore = vi.fn(() => ({
    collection: mockCollection,
    recursiveDelete: mockRecursiveDelete,
  }))

  return {
    mockGet,
    mockSet,
    mockDelete,
    mockDoc,
    mockCollection,
    mockFirestore,
    mockWhereLimitGet,
    mockRecursiveDelete,
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

  it('merges documents with Firestore merge', async () => {
    await adapter.mergeDocument('users/u1', { settings: { theme: 'dark-forest' } })

    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('u1')
    expect(mockSet).toHaveBeenCalledWith({ settings: { theme: 'dark-forest' } }, { merge: true })
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

  it('legacyUsernameOwnerUid returns the matching user document id', async () => {
    mockWhereLimitGet.mockResolvedValue({ empty: false, docs: [{ id: 'uid-one' }] })

    await expect(adapter.legacyUsernameOwnerUid('users', 'taken')).resolves.toBe('uid-one')

    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockWhereLimitGet).toHaveBeenCalled()
  })

  it('legacyUsernameOwnerUid returns null when no user matches', async () => {
    mockWhereLimitGet.mockResolvedValue({ empty: true, docs: [] })

    await expect(adapter.legacyUsernameOwnerUid('users', 'free')).resolves.toBeNull()
  })

  it('legacyUsernameClaimed is true when a matching user exists', async () => {
    mockWhereLimitGet.mockResolvedValue({ empty: false, docs: [{ id: 'x' }] })

    await expect(adapter.legacyUsernameClaimed('users', 'taken')).resolves.toBe(true)
  })

  it('legacyUsernameClaimed is false when no user matches', async () => {
    mockWhereLimitGet.mockResolvedValue({ empty: true, docs: [] })

    await expect(adapter.legacyUsernameClaimed('users', 'free')).resolves.toBe(false)
  })

  it('recursiveDeleteDocument delegates to Firestore recursiveDelete', async () => {
    await adapter.recursiveDeleteDocument('users/account-1')

    expect(mockCollection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('account-1')
    expect(mockRecursiveDelete).toHaveBeenCalledTimes(1)
  })
})
