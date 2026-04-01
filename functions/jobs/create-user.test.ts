import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import createUser from './create-user.js'
import { DATABASE_COLLECTION_USERS } from '../config/constants.js'
import type { DocumentStore } from '../ports/document-store.js'
import { configureLogger } from '../services/logger.js'

describe('createUser', () => {
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
      getDocument: vi.fn(),
      setDocument: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a user with all required fields', async () => {
    const userRecord = {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
    }

    const result = await createUser(userRecord, documentStore)

    expect(result.result).toBe('SUCCESS')
    expect(result.userData).toEqual({
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      username: null,
      tokens: {},
      subscription: {
        active: true,
      },
      entitlements: {
        cdn: false,
        customDomain: false,
      },
      onboarding: {
        currentStep: 'username',
        completedSteps: [],
        draftCustomDomain: null,
        updatedAt: expect.any(String),
      },
      widgets: {},
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })

    expect(documentStore.setDocument).toHaveBeenCalledWith(
      `${DATABASE_COLLECTION_USERS}/test-uid-123`,
      {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: null,
        tokens: {},
        subscription: {
          active: true,
        },
        entitlements: {
          cdn: false,
          customDomain: false,
        },
        onboarding: {
          currentStep: 'username',
          completedSteps: [],
          draftCustomDomain: null,
          updatedAt: expect.any(String),
        },
        widgets: {},
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }
    )

    expect(logger.info).toHaveBeenCalledWith('User created successfully in database.', {
      uid: 'test-uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
    })
  })

  it('should create a user with null displayName when not provided', async () => {
    const result = await createUser(
      {
        uid: 'test-uid-456',
        email: 'test2@example.com',
      },
      documentStore
    )

    expect(result.result).toBe('SUCCESS')
    expect(result.userData).toEqual(
      expect.objectContaining({
        displayName: null,
      })
    )
  })

  it('should create a user with empty tokens and widgets objects', async () => {
    const result = await createUser(
      {
        uid: 'test-uid-789',
        email: 'test3@example.com',
        displayName: 'Test User 3',
      },
      documentStore
    )

    expect(result.result).toBe('SUCCESS')
    expect(result.userData).toEqual(
      expect.objectContaining({
        tokens: {},
        widgets: {},
        subscription: { active: true },
      })
    )
  })

  it('should handle DocumentStore errors gracefully', async () => {
    vi.mocked(documentStore.setDocument).mockRejectedValue(new Error('DocumentStore connection failed'))

    const result = await createUser(
      {
        uid: 'test-uid-error',
        email: 'error@example.com',
        displayName: 'Error User',
      },
      documentStore
    )

    expect(result).toEqual({
      result: 'FAILURE',
      error: 'DocumentStore connection failed',
    })

    expect(logger.error).toHaveBeenCalledWith('Failed to create user in database.', {
      uid: 'test-uid-error',
      email: 'error@example.com',
      error: 'DocumentStore connection failed',
    })
  })

  it('should handle errors with missing error.message', async () => {
    vi.mocked(documentStore.setDocument).mockRejectedValue({ customError: 'Something went wrong' })

    const result = await createUser(
      {
        uid: 'test-uid-no-message',
        email: 'no-message@example.com',
        displayName: 'No Message User',
      },
      documentStore
    )

    expect(result).toEqual({
      result: 'FAILURE',
      error: undefined,
    })
  })

  it('should handle user record with empty string displayName', async () => {
    const result = await createUser(
      {
        uid: 'empty-display-uid',
        email: 'empty@example.com',
        displayName: '',
      },
      documentStore
    )

    expect(result.result).toBe('SUCCESS')
    expect(result.userData).toEqual(
      expect.objectContaining({
        displayName: null,
      })
    )
  })
})
