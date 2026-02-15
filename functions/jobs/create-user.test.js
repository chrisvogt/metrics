import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import admin from 'firebase-admin'
import { logger } from 'firebase-functions'

import createUser from './create-user.js'
import { DATABASE_COLLECTION_USERS } from '../lib/constants.js'

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn()
        }))
      }))
    })),
    Timestamp: {
      now: vi.fn()
    }
  }
}))

// Mock Firebase Functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('createUser', () => {
  let mockDb
  let mockCollection
  let mockDoc
  let mockSet
  let mockTimestamp

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock chain
    mockSet = vi.fn()
    mockDoc = vi.fn(() => ({ set: mockSet }))
    mockCollection = vi.fn(() => ({ doc: mockDoc }))
    mockDb = { collection: mockCollection }
    
    // Mock admin.firestore() to return our mock
    admin.firestore = vi.fn(() => mockDb)
    
    // Mock Timestamp.now() to return a consistent mock object
    mockTimestamp = { _seconds: 1756095454, _nanoseconds: 0 }
    admin.Timestamp.now = vi.fn(() => mockTimestamp)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful user creation', () => {
    it('should create a user with all required fields', async () => {
      const userRecord = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User'
      }

      mockSet.mockResolvedValue(undefined)

      const result = await createUser(userRecord)

      // Verify the result
      expect(result.result).toBe('SUCCESS')
      expect(result.userData).toEqual({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tokens: {},
        subscription: {
          active: true
        },
        widgets: {},
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object)
      })

      // Verify Firestore calls
      expect(admin.firestore).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith(DATABASE_COLLECTION_USERS)
      expect(mockDoc).toHaveBeenCalledWith('test-uid-123')
      expect(mockSet).toHaveBeenCalledWith({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tokens: {},
        subscription: {
          active: true
        },
        widgets: {},
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object)
      })

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('User created successfully in database.', {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User'
      })
    })

    it('should create a user with null displayName when not provided', async () => {
      const userRecord = {
        uid: 'test-uid-456',
        email: 'test2@example.com'
        // displayName intentionally omitted
      }

      mockSet.mockResolvedValue(undefined)

      const result = await createUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(result.userData.displayName).toBeNull()

      // Verify Firestore calls
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: null
        })
      )

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('User created successfully in database.', {
        uid: 'test-uid-456',
        email: 'test2@example.com',
        displayName: undefined
      })
    })

    it('should create a user with empty tokens and widgets objects', async () => {
      const userRecord = {
        uid: 'test-uid-789',
        email: 'test3@example.com',
        displayName: 'Test User 3'
      }

      mockSet.mockResolvedValue(undefined)

      const result = await createUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(result.userData.tokens).toEqual({})
      expect(result.userData.widgets).toEqual({})
      expect(result.userData.subscription.active).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const userRecord = {
        uid: 'test-uid-error',
        email: 'error@example.com',
        displayName: 'Error User'
      }

      const mockError = new Error('Firestore connection failed')
      mockSet.mockRejectedValue(mockError)

      const result = await createUser(userRecord)

      // Verify the result
      expect(result.result).toBe('FAILURE')
      expect(result.error).toBe('Firestore connection failed')

      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith('Failed to create user in database.', {
        uid: 'test-uid-error',
        email: 'error@example.com',
        error: 'Firestore connection failed'
      })

      // Verify no success logging
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should handle errors with missing error.message', async () => {
      const userRecord = {
        uid: 'test-uid-no-message',
        email: 'no-message@example.com',
        displayName: 'No Message User'
      }

      const mockError = { customError: 'Something went wrong' }
      mockSet.mockRejectedValue(mockError)

      const result = await createUser(userRecord)

      expect(result.result).toBe('FAILURE')
      expect(result.error).toBeUndefined()

      expect(logger.error).toHaveBeenCalledWith('Failed to create user in database.', {
        uid: 'test-uid-no-message',
        email: 'no-message@example.com',
        error: undefined
      })
    })
  })

  describe('data structure validation', () => {
    it('should use the correct database collection', async () => {
      const userRecord = {
        uid: 'test-uid-collection',
        email: 'collection@example.com',
        displayName: 'Collection Test'
      }

      mockSet.mockResolvedValue(undefined)

      await createUser(userRecord)

      expect(mockCollection).toHaveBeenCalledWith(DATABASE_COLLECTION_USERS)
    })

    it('should use the correct document ID', async () => {
      const userRecord = {
        uid: 'test-uid-doc-id',
        email: 'docid@example.com',
        displayName: 'Doc ID Test'
      }

      mockSet.mockResolvedValue(undefined)

      await createUser(userRecord)

      expect(mockDoc).toHaveBeenCalledWith('test-uid-doc-id')
    })

    it('should include all required user data fields', async () => {
      const userRecord = {
        uid: 'test-uid-fields',
        email: 'fields@example.com',
        displayName: 'Fields Test'
      }

      mockSet.mockResolvedValue(undefined)

      await createUser(userRecord)

      const expectedData = {
        uid: 'test-uid-fields',
        email: 'fields@example.com',
        displayName: 'Fields Test',
        tokens: {},
        subscription: {
          active: true
        },
        widgets: {},
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object)
      }

      expect(mockSet).toHaveBeenCalledWith(expectedData)
    })
  })

  describe('edge cases', () => {
    it('should handle user record with only uid and email', async () => {
      const userRecord = {
        uid: 'minimal-uid',
        email: 'minimal@example.com'
      }

      mockSet.mockResolvedValue(undefined)

      const result = await createUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(result.userData.displayName).toBeNull()
      expect(result.userData.uid).toBe('minimal-uid')
      expect(result.userData.email).toBe('minimal@example.com')
    })

    it('should handle user record with empty string displayName', async () => {
      const userRecord = {
        uid: 'empty-display-uid',
        email: 'empty@example.com',
        displayName: ''
      }

      mockSet.mockResolvedValue(undefined)

      const result = await createUser(userRecord)

      expect(result.result).toBe('SUCCESS')
      expect(result.userData.displayName).toBeNull() // Empty string becomes null due to || null logic
    })
  })
})
