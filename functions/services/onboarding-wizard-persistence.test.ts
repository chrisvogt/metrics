import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

const mockIntegrationGet = vi.fn()
const mockRunTransaction = vi.fn()
const mockBatchCommit = vi.fn()
const mockBatchDelete = vi.fn()
const mockBatchSet = vi.fn()

const mockBatch = vi.fn(() => ({
  delete: mockBatchDelete.mockReturnThis(),
  set: mockBatchSet.mockReturnThis(),
  commit: mockBatchCommit.mockResolvedValue(undefined),
}))

/** Returns a doc ref whose `.collection('integrations')` supports `.get()`. */
function makeUserDocRef(collectionName: string, uid: string) {
  return {
    id: uid,
    path: `${collectionName}/${uid}`,
    collection: (segment: string) => {
      if (segment === 'integrations') {
        return {
          get: mockIntegrationGet,
          doc: vi.fn((providerId: string) => ({
            id: providerId,
            path: `${collectionName}/${uid}/${segment}/${providerId}`,
          })),
        }
      }
      return { get: vi.fn() }
    },
  }
}

function makeCollectionMock() {
  return vi.fn((collectionName: string) => ({
    doc: vi.fn((uid: string) => makeUserDocRef(collectionName, uid)),
  }))
}

const mockCollection = makeCollectionMock()
const mockFirestoreInstance = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
  batch: mockBatch,
}

vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(() => mockFirestoreInstance),
  },
}))

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => ({ __sv: 'serverTimestamp' }),
    delete: () => ({ __sv: 'deleteField' }),
  },
}))

import {
  loadOnboardingStateForApi,
  persistOnboardingWizardState,
} from './onboarding-wizard-persistence.js'

describe('onboarding-wizard-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIntegrationGet.mockResolvedValue({
      docs: [
        { id: 'spotify', data: () => ({ status: 'connected', providerId: 'spotify' }) },
        { id: 'github', data: () => ({ status: 'pending_oauth', providerId: 'github' }) },
      ],
    })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  afterEach(() => {
    mockCollection.mockReset()
    mockCollection.mockImplementation((name: string) => ({
      doc: vi.fn((uid: string) => makeUserDocRef(name, uid)),
    }))
  })

  it('loadOnboardingStateForApi merges integration doc ids into payload', async () => {
    const payload = await loadOnboardingStateForApi({
      usersCollection: 'users',
      uid: 'abc',
      userDoc: {
        username: 'x',
        onboarding: {
          currentStep: 'done',
          completedSteps: ['username', 'connections', 'domain'],
          draftCustomDomain: null,
          updatedAt: 't',
        },
      },
    })

    expect(payload.connectedProviderIds).toEqual(['spotify', 'github'])
    expect(payload.integrationStatuses).toEqual({
      spotify: 'connected',
      github: 'pending_oauth',
    })
    expect(payload.username).toBe('x')
    expect(mockFirestoreInstance.collection).toHaveBeenCalledWith('users')
  })

  it('loadOnboardingStateForApi maps empty or non-string integration status to unknown', async () => {
    mockIntegrationGet.mockResolvedValueOnce({
      docs: [
        { id: 'flickr', data: () => ({ status: '' }) },
        { id: 'x', data: () => ({ providerId: 'x' }) },
        { id: 'y', data: () => ({ status: 404 }) },
      ],
    })
    const payload = await loadOnboardingStateForApi({
      usersCollection: 'users',
      uid: 'u1',
      userDoc: {
        username: 'slug',
        onboarding: {
          currentStep: 'connections',
          completedSteps: ['username'],
          draftCustomDomain: null,
          updatedAt: 't',
        },
      },
    })
    expect(payload.integrationStatuses).toEqual({
      flickr: 'unknown',
      x: 'unknown',
      y: 'unknown',
    })
  })

  it('persistOnboardingWizardState treats missing user doc as empty profile', async () => {
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: false })
    const txSet = vi.fn()
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: vi.fn() })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'new-user',
      parsed: {
        currentStep: 'username',
        completedSteps: [],
        username: 'firstonly',
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txSet).toHaveBeenCalled()
  })

  it('persistOnboardingWizardState does not delete old claim when snapshot uid mismatches', async () => {
    const txDelete = vi.fn()
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ username: 'oldsl' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
      })
      .mockResolvedValueOnce({ exists: false })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: vi.fn(), delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'me',
      parsed: {
        currentStep: 'username',
        completedSteps: [],
        username: 'newsl',
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txDelete).not.toHaveBeenCalled()
  })

  it('persistOnboardingWizardState runs transaction and syncs integration stubs', async () => {
    const txGet = vi.fn()
    const txSet = vi.fn()
    const txDelete = vi.fn()

    txGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ username: 'oldslug' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        get: (field: string) => (field === 'uid' ? 'abc' : undefined),
      })
      .mockResolvedValueOnce({
        exists: false,
      })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        get: txGet,
        set: txSet,
        delete: txDelete,
      })
    })

    mockIntegrationGet.mockResolvedValueOnce({
      docs: [{ id: 'spotify', ref: { id: 'spotify' } }, { id: 'discogs', ref: { id: 'discogs' } }],
    })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'abc',
      parsed: {
        currentStep: 'connections',
        completedSteps: ['username'],
        username: 'newslug',
        connectedProviderIds: ['spotify'],
        customDomain: null,
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    })

    expect(txGet).toHaveBeenCalled()
    expect(txSet).toHaveBeenCalled()
    expect(txDelete).toHaveBeenCalled()
    expect(mockBatchDelete).toHaveBeenCalled()
    /* spotify already exists — only discogs is removed; no new stub sets */
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('persistOnboardingWizardState creates integration stubs that do not yet exist', async () => {
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({ exists: true, data: () => ({}) })
      .mockResolvedValueOnce({ exists: false })
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: vi.fn(), delete: vi.fn() })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'abc',
      parsed: {
        currentStep: 'connections',
        completedSteps: [],
        username: 'newbie',
        connectedProviderIds: ['github'],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txGet).toHaveBeenCalled()
    /* One batch: only creates */
    expect(mockBatchSet).toHaveBeenCalled()
    expect(mockBatchDelete).not.toHaveBeenCalled()
  })

  it('persistOnboardingWizardState does not set username patch when slug stays unset', async () => {
    const txGet = vi.fn().mockResolvedValueOnce({
      exists: true,
      data: () => ({}),
    })
    const txSet = vi.fn()
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: vi.fn() })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u',
      parsed: {
        currentStep: 'username',
        completedSteps: [],
        username: null,
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    const patch = txSet.mock.calls[0][1] as Record<string, unknown>
    expect(patch).not.toHaveProperty('username')
  })

  it('persistOnboardingWizardState skips claim churn when username unchanged', async () => {
    const txGet = vi.fn().mockResolvedValueOnce({
      exists: true,
      data: () => ({ username: 'same' }),
    })
    const txSet = vi.fn()
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: vi.fn() })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u',
      parsed: {
        currentStep: 'connections',
        completedSteps: [],
        username: 'same',
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txGet).toHaveBeenCalledTimes(1)
    expect(txSet).toHaveBeenCalled()
  })

  it('persistOnboardingWizardState keeps claim when slug already owned by same uid', async () => {
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({ exists: true, data: () => ({}) })
      .mockResolvedValueOnce({
        exists: true,
        get: (f: string) => (f === 'uid' ? 'me' : undefined),
      })
    const txSet = vi.fn()
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: vi.fn() })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'me',
      parsed: {
        currentStep: 'username',
        completedSteps: [],
        username: 'mine',
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txSet).toHaveBeenCalled()
  })

  it('persistOnboardingWizardState throws username_taken when claim owned by another uid', async () => {
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({ exists: true, data: () => ({}) })
      .mockResolvedValueOnce({
        exists: true,
        get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
      })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        get: txGet,
        set: vi.fn(),
        delete: vi.fn(),
      })
    })

    await expect(
      persistOnboardingWizardState({
        usersCollection: 'users',
        uid: 'me',
        parsed: {
          currentStep: 'username',
          completedSteps: [],
          username: 'taken',
          connectedProviderIds: [],
          customDomain: null,
          updatedAt: 't',
        },
      })
    ).rejects.toThrow('username_taken')
  })

  it('persistOnboardingWizardState clears username field when slug removed', async () => {
    const txGet = vi
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ username: 'gone' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        get: (f: string) => (f === 'uid' ? 'u' : undefined),
      })

    const txSet = vi.fn()
    const txDelete = vi.fn()
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u',
      parsed: {
        currentStep: 'username',
        completedSteps: [],
        username: null,
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txDelete).toHaveBeenCalled()
    const patchArg = txSet.mock.calls.find(
      (c) => c[1] && typeof c[1] === 'object' && 'onboarding' in (c[1] as object)
    )?.[1] as Record<string, unknown>
    expect(patchArg?.username).toEqual({ __sv: 'deleteField' })
  })
})
