import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import admin from 'firebase-admin'
import { logger } from 'firebase-functions'

import deleteUser from './delete-user.js'
import { DATABASE_COLLECTION_USERS } from '../constants.js'

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          delete: vi.fn()
        }))
      }))
    }))
  }
}))

// Mock Firebase Functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('deleteUser', () => {
  let mockDb
  let mockCollection
  let mockDoc
  let mockDelete

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock chain
    mockDelete = vi.fn()
    mockDoc = vi.fn(() => ({ delete: mockDelete }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockDb = { collection: mockCollection }
    
    // Mock admin.firestore() to return our mock
    admin.firestore = vi.fn(() => mockDb)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful user deletion', () => {
    it('should delete a user successfully', async () => {
      const userRecord = {
        uid: 'test-uid-123'
      }

      mockDelete.mockResolvedValue(undefined)

      const result = await deleteUser(userRecord)

      // Verify the result
      expect(result.result).toBe('SUCCESS')
      expect(result.error).toBeUndefined()

      // Verify Firestore calls
      expect(admin.firestore).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(DATABASE_COLLECTION_USERS)
      expect(mockDoc).toHaveBeenCalledWith('test-uid-123')
      expect(mockDelete).toHaveBeenCalled()

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('User deleted successfully from database.', {
        uid: 'test-uid-123'
      })
    })

    it('should handle user record with additional properties', async () => {
      const userRecord = {
        uid: 'test-uid-456',
        email: 'test@example.com',
        displayName: 'Test User',
        extraProperty: 'should be ignored'
      }

      mockDelete.mockResolvedValue(undefined)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(mockDoc).toHaveBeenCalledWith('test-uid-456')
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const userRecord = {
        uid: 'test-uid-error'
      }

      const mockError = new Error('Firestore connection failed')
      mockDelete.mockRejectedValue(mockError)

      const result = await deleteUser(userRecord)

      // Verify the result
      expect(result.result).toBe('FAILURE')
      expect(result.error).toBe('Firestore connection failed')

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
        uid: 'test-uid-error',
        error: 'Firestore connection failed'
      })

      // Verify no success logging
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should handle errors with missing error.message', async () => {
      const userRecord = {
        uid: 'test-uid-no-message'
      }

      const mockError = { customError: 'Something went wrong' }
      mockDelete.mockRejectedValue(mockError)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('FAILURE')
      expect(result.error).toBeUndefined()

      expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
        uid: 'test-uid-no-message',
        error: undefined
      })
    })

    it('should handle permission denied errors', async () => {
      const userRecord = {
        uid: 'test-uid-permission'
      }

      const mockError = new Error('Permission denied')
      mockDelete.mockRejectedValue(mockError)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('FAILURE')
      expect(result.error).toBe('Permission denied')
      expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
        uid: 'test-uid-permission',
        error: 'Permission denied'
      })
    })

    it('should handle document not found errors', async () => {
      const userRecord = {
        uid: 'test-uid-not-found'
      }

      const mockError = new Error('Document not found')
      mockDelete.mockRejectedValue(mockError)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('FAILURE')
      expect(result.error).toBe('Document not found')
      expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
        uid: 'test-uid-not-found',
        error: 'Document not found'
      })
    })
  })

  describe('data structure validation', () => {
    it('should use the correct database collection', async () => {
      const userRecord = {
        uid: 'test-uid-collection'
      }

      mockDelete.mockResolvedValue(undefined)

      await deleteUser(userRecord)

      expect(mockCollection).toHaveBeenCalledWith(DATABASE_COLLECTION_USERS)
    })

    it('should use the correct document ID', async () => {
      const userRecord = {
        uid: 'test-uid-doc-id'
      }

      mockDelete.mockResolvedValue(undefined)

      await deleteUser(userRecord)

      expect(mockDoc).toHaveBeenCalledWith('test-uid-doc-id')
    })

    it('should call delete method without parameters', async () => {
      const userRecord = {
        uid: 'test-uid-delete-call'
      }

      mockDelete.mockResolvedValue(undefined)

      await deleteUser(userRecord)

      expect(mockDelete).toHaveBeenCalledWith()
    })
  })

  describe('edge cases', () => {
    it('should handle user record with only uid property', async () => {
      const userRecord = {
        uid: 'minimal-uid'
      }

      mockDelete.mockResolvedValue(undefined)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(result.uid).toBeUndefined() // uid is not returned in success case
    })

    it('should handle empty string uid', async () => {
      const userRecord = {
        uid: ''
      }

      mockDelete.mockResolvedValue(undefined)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(mockDoc).toHaveBeenCalledWith('')
    })

    it('should handle numeric uid', async () => {
      const userRecord = {
        uid: 12345
      }

      mockDelete.mockResolvedValue(undefined)

      const result = await deleteUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(mockDoc).toHaveBeenCalledWith(12345)
    })
  })

  describe('logging behavior', () => {
    it('should log success with correct uid', async () => {
      const userRecord = {
        uid: 'test-uid-logging'
      }

      mockDelete.mockResolvedValue(undefined)

      await deleteUser(userRecord)

      expect(logger.info).toHaveBeenCalledWith('User deleted successfully from database.', {
        uid: 'test-uid-logging'
      })
    })

    it('should log error with correct uid and error message', async () => {
      const userRecord = {
        uid: 'test-uid-error-logging'
      }

      const mockError = new Error('Test error message')
      mockDelete.mockRejectedValue(mockError)

      await deleteUser(userRecord)

      expect(logger.error).toHaveBeenCalledWith('Failed to delete user from database.', {
        uid: 'test-uid-error-logging',
        error: 'Test error message'
      })
    })

    it('should not log success when deletion fails', async () => {
      const userRecord = {
        uid: 'test-uid-no-success-log'
      }

      mockDelete.mockRejectedValue(new Error('Deletion failed'))

      await deleteUser(userRecord)

      expect(logger.info).not.toHaveBeenCalled()
    })
  })
})
