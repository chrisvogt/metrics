import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'

import createUser from './create-user.js'

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          set: vi.fn()
        }))
      }))
    }))
  }
}))

// Mock logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('createUser', () => {
  let mockFirestore
  let mockDoc
  let mockSet

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSet = vi.fn()
    mockDoc = vi.fn(() => ({ set: mockSet }))
    mockFirestore = {
      collection: vi.fn(() => ({ doc: mockDoc }))
    }
    
    admin.firestore.mockReturnValue(mockFirestore)
  })

  it('should create a user record with the correct structure', async () => {
    const userRecord = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User'
    }

    mockSet.mockResolvedValue()

    const result = await createUser(userRecord)

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

    expect(mockFirestore.collection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('test-uid-123')
    expect(mockSet).toHaveBeenCalledWith(result.userData)
  })

  it('should handle null displayName', async () => {
    const userRecord = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: null
    }

    mockSet.mockResolvedValue()

    const result = await createUser(userRecord)

    expect(result.result).toBe('SUCCESS')
    expect(result.userData.displayName).toBe(null)
  })

  it('should handle missing displayName', async () => {
    const userRecord = {
      uid: 'test-uid-123',
      email: 'test@example.com'
    }

    mockSet.mockResolvedValue()

    const result = await createUser(userRecord)

    expect(result.result).toBe('SUCCESS')
    expect(result.userData.displayName).toBe(null)
  })

  it('should handle database errors', async () => {
    const userRecord = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User'
    }

    const dbError = new Error('Database connection failed')
    mockSet.mockRejectedValue(dbError)

    const result = await createUser(userRecord)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Database connection failed')
  })
})
