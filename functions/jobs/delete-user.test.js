import { describe, it, expect, vi, beforeEach } from 'vitest'
import admin from 'firebase-admin'

import deleteUser from './delete-user.js'

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

// Mock logger
vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('deleteUser', () => {
  let mockFirestore
  let mockDoc
  let mockDelete

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockDelete = vi.fn()
    mockDoc = vi.fn(() => ({ delete: mockDelete }))
    mockFirestore = {
      collection: vi.fn(() => ({ doc: mockDoc }))
    }
    
    admin.firestore.mockReturnValue(mockFirestore)
  })

  it('should delete a user record successfully', async () => {
    const userRecord = {
      uid: 'test-uid-123'
    }

    mockDelete.mockResolvedValue()

    const result = await deleteUser(userRecord)

    expect(result.result).toBe('SUCCESS')

    expect(mockFirestore.collection).toHaveBeenCalledWith('users')
    expect(mockDoc).toHaveBeenCalledWith('test-uid-123')
    expect(mockDelete).toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    const userRecord = {
      uid: 'test-uid-123'
    }

    const dbError = new Error('Database connection failed')
    mockDelete.mockRejectedValue(dbError)

    const result = await deleteUser(userRecord)

    expect(result.result).toBe('FAILURE')
    expect(result.error).toBe('Database connection failed')
  })

  it('should handle missing uid gracefully', async () => {
    const userRecord = {}

    const result = await deleteUser(userRecord)

    expect(result.result).toBe('SUCCESS')
    expect(mockDoc).toHaveBeenCalledWith(undefined)
  })
})
