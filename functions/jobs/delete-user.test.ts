import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import deleteUser from './delete-user.js'
import { DATABASE_COLLECTION_USERS } from '../config/constants.js'
import { TENANT_USERNAMES_COLLECTION } from '../config/future-tenant-collections.js'
import type { DocumentStore } from '../ports/document-store.js'
import { configureLogger } from '../services/logger.js'

describe('deleteUser', () => {
  let documentStore: DocumentStore
  const logger = {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    configureLogger(logger)
    documentStore = {
      getDocument: vi.fn().mockResolvedValue(null),
      setDocument: vi.fn(),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
      recursiveDeleteDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delete a user successfully', async () => {
    const result = await deleteUser({ uid: 'test-uid-123' }, documentStore)

    expect(result).toEqual({ result: 'SUCCESS' })
    expect(documentStore.getDocument).toHaveBeenCalledWith(
      `${DATABASE_COLLECTION_USERS}/test-uid-123`
    )
    expect(documentStore.recursiveDeleteDocument).toHaveBeenCalledWith(
      `${DATABASE_COLLECTION_USERS}/test-uid-123`
    )
    expect(logger.info).toHaveBeenCalledWith('User deleted successfully from database.', {
      uid: 'test-uid-123',
    })
  })

  it('should remove tenant username claim when profile has username', async () => {
    vi.mocked(documentStore.getDocument!).mockResolvedValue({
      username: 'CoolDev',
    })

    const result = await deleteUser({ uid: 'test-uid-456' }, documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(documentStore.deleteDocument).toHaveBeenCalledWith(
      `${TENANT_USERNAMES_COLLECTION}/cooldev`
    )
    expect(documentStore.recursiveDeleteDocument).toHaveBeenCalled()
  })

  it('should handle user records with additional properties', async () => {
    const result = await deleteUser(
      {
        uid: 'test-uid-456',
        email: 'test@example.com',
        displayName: 'Test User',
      } as never,
      documentStore
    )

    expect(result.result).toBe('SUCCESS')
    expect(documentStore.recursiveDeleteDocument).toHaveBeenCalled()
  })

  it('should handle DocumentStore errors gracefully', async () => {
    vi.mocked(documentStore.recursiveDeleteDocument!).mockRejectedValueOnce(
      new Error('DocumentStore connection failed')
    )

    const result = await deleteUser({ uid: 'test-uid-error' }, documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'DocumentStore connection failed',
    })

    expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
      uid: 'test-uid-error',
      error: 'DocumentStore connection failed',
    })
  })

  it('should fail cleanly when deletes are unsupported', async () => {
    const noDeleteStore: DocumentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }

    const result = await deleteUser({ uid: 'test-uid-unsupported' }, noDeleteStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'Configured DocumentStore does not support deletes',
    })
  })

  it('should handle errors with missing error.message', async () => {
    vi.mocked(documentStore.recursiveDeleteDocument!).mockRejectedValueOnce({
      customError: 'Something went wrong',
    })

    const result = await deleteUser({ uid: 'test-uid-no-message' }, documentStore)

    expect(result).toEqual({
      result: 'FAILURE',
      error: undefined,
    })
  })

  it('should pass through empty string uids', async () => {
    const result = await deleteUser({ uid: '' }, documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(documentStore.getDocument).toHaveBeenCalledWith(`${DATABASE_COLLECTION_USERS}/`)
    expect(documentStore.recursiveDeleteDocument).toHaveBeenCalled()
  })
})
