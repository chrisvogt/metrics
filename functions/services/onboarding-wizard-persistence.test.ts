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

/** Snapshot returned from `tx.get`; persistence uses `.ref` for follow-up set/delete. */
function txDocSnap(
  ref: { path: string },
  snap: { exists: boolean; data?: () => unknown; get?: (f: string) => unknown }
) {
  return { ...snap, ref }
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/new-user') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/me') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({ username: 'oldsl' }) }))
      }
      if (ref.path === 'tenant_usernames/oldsl') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
          })
        )
      }
      if (ref.path === 'tenant_usernames/newsl') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

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

    txGet.mockImplementation((ref: { path: string }) => {
      if (ref.path === 'users/abc') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({ username: 'oldslug' }) }))
      }
      if (ref.path === 'tenant_usernames/oldslug') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (field: string) => (field === 'uid' ? 'abc' : undefined),
          })
        )
      }
      if (ref.path === 'tenant_usernames/newslug') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/abc') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({}) }))
      }
      if (ref.path === 'tenant_usernames/newbie') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })
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
    const txGet = vi.fn((ref: { path: string }) =>
      Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({}) }))
    )
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
    const txGet = vi.fn((ref: { path: string }) =>
      Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({ username: 'same' }) }))
    )
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/me') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({}) }))
      }
      if (ref.path === 'tenant_usernames/mine') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'me' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/me') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({}) }))
      }
      if (ref.path === 'tenant_usernames/taken') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
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
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({ username: 'gone' }) }))
      }
      if (ref.path === 'tenant_usernames/gone') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'u' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
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

  it('persistOnboardingWizardState claims tenant_hosts and sets tenantHostname when domain is new', async () => {
    const txSet = vi.fn()
    const txDelete = vi.fn()
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/uid-new') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({ username: 'sl' }) }))
      }
      if (ref.path === 'tenant_hosts/api.new.example.com') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'uid-new',
      parsed: {
        currentStep: 'domain',
        completedSteps: ['username', 'connections'],
        username: 'sl',
        connectedProviderIds: [],
        customDomain: 'api.new.example.com',
        updatedAt: 't',
      },
    })

    expect(txSet).toHaveBeenCalled()
    const hostSet = txSet.mock.calls.find(
      (c) =>
        c[0]?.path === 'tenant_hosts/api.new.example.com' &&
        c[1] &&
        typeof c[1] === 'object' &&
        (c[1] as Record<string, unknown>).uid === 'uid-new'
    )
    expect(hostSet).toBeDefined()
    const userMerge = txSet.mock.calls.find(
      (c) => c[0]?.path === 'users/uid-new' && c[1] && (c[1] as Record<string, unknown>).tenantHostname
    )?.[1] as Record<string, unknown>
    expect(userMerge?.tenantHostname).toBe('api.new.example.com')
  })

  it('persistOnboardingWizardState throws hostname_taken when another uid owns the host', async () => {
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/me') {
        return Promise.resolve(txDocSnap(ref, { exists: true, data: () => ({}) }))
      }
      if (ref.path === 'tenant_hosts/api.taken.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: vi.fn(), delete: vi.fn() })
    })

    await expect(
      persistOnboardingWizardState({
        usersCollection: 'users',
        uid: 'me',
        parsed: {
          currentStep: 'domain',
          completedSteps: [],
          username: null,
          connectedProviderIds: [],
          customDomain: 'api.taken.example.com',
          updatedAt: 't',
        },
      })
    ).rejects.toThrow('hostname_taken')
  })

  it('persistOnboardingWizardState releases prior tenant_hosts when domain changes', async () => {
    const txDelete = vi.fn()
    const txSet = vi.fn()
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u1') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            data: () => ({
              username: 'a',
              tenantHostname: 'old.example.com',
            }),
          })
        )
      }
      if (ref.path === 'tenant_hosts/old.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'u1' : undefined),
          })
        )
      }
      if (ref.path === 'tenant_hosts/new.example.com') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u1',
      parsed: {
        currentStep: 'domain',
        completedSteps: ['username', 'connections', 'domain'],
        username: 'a',
        connectedProviderIds: [],
        customDomain: 'new.example.com',
        updatedAt: 't',
      },
    })

    expect(txDelete).toHaveBeenCalled()
    const userMerge = txSet.mock.calls.find(
      (c) => c[0]?.path === 'users/u1'
    )?.[1] as Record<string, unknown>
    expect(userMerge?.tenantHostname).toBe('new.example.com')
  })

  it('persistOnboardingWizardState clears tenantHostname when custom domain is removed', async () => {
    const txSet = vi.fn()
    const txDelete = vi.fn()
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u-clear') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            data: () => ({
              username: 'sluggy',
              tenantHostname: 'api.oldclear.example.com',
            }),
          })
        )
      }
      if (ref.path === 'tenant_hosts/api.oldclear.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'u-clear' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u-clear',
      parsed: {
        currentStep: 'done',
        completedSteps: ['username', 'connections', 'domain'],
        username: 'sluggy',
        connectedProviderIds: [],
        customDomain: null,
        updatedAt: 't',
      },
    })

    expect(txDelete).toHaveBeenCalled()
    const userMerge = txSet.mock.calls.find((c) => c[0]?.path === 'users/u-clear')?.[1] as Record<
      string,
      unknown
    >
    expect(userMerge?.tenantHostname).toEqual({ __sv: 'deleteField' })
  })

  it('persistOnboardingWizardState does not delete prior host when stored claim belongs to another uid', async () => {
    const txDelete = vi.fn()
    const txSet = vi.fn()
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u-conflict') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            data: () => ({
              tenantHostname: 'api.stolen.example.com',
            }),
          })
        )
      }
      if (ref.path === 'tenant_hosts/api.stolen.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'someone-else' : undefined),
          })
        )
      }
      if (ref.path === 'tenant_hosts/api.mine.example.com') {
        return Promise.resolve(txDocSnap(ref, { exists: false }))
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u-conflict',
      parsed: {
        currentStep: 'domain',
        completedSteps: ['domain'],
        username: null,
        connectedProviderIds: [],
        customDomain: 'api.mine.example.com',
        updatedAt: 't',
      },
    })

    expect(txDelete).not.toHaveBeenCalled()
    const userMerge = txSet.mock.calls.find(
      (c) => c[0]?.path === 'users/u-conflict'
    )?.[1] as Record<string, unknown>
    expect(userMerge?.tenantHostname).toBe('api.mine.example.com')
  })

  it('persistOnboardingWizardState sets host doc when new hostname already claimed by same uid', async () => {
    const txSet = vi.fn()
    const txDelete = vi.fn()
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u-self') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            data: () => ({
              tenantHostname: 'api.oldself.example.com',
            }),
          })
        )
      }
      if (ref.path === 'tenant_hosts/api.oldself.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'u-self' : undefined),
          })
        )
      }
      if (ref.path === 'tenant_hosts/api.sharedself.example.com') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            get: (f: string) => (f === 'uid' ? 'u-self' : undefined),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: txSet, delete: txDelete })
    })
    mockIntegrationGet.mockResolvedValueOnce({ docs: [] })

    await persistOnboardingWizardState({
      usersCollection: 'users',
      uid: 'u-self',
      parsed: {
        currentStep: 'domain',
        completedSteps: ['domain'],
        username: null,
        connectedProviderIds: [],
        customDomain: 'api.sharedself.example.com',
        updatedAt: 't',
      },
    })

    expect(txDelete).toHaveBeenCalled()
    const hostSets = txSet.mock.calls.filter(
      (c) => c[0]?.path === 'tenant_hosts/api.sharedself.example.com'
    )
    expect(hostSets.length).toBeGreaterThan(0)
    const userMerge = txSet.mock.calls.find((c) => c[0]?.path === 'users/u-self')?.[1] as Record<
      string,
      unknown
    >
    expect(userMerge?.tenantHostname).toBe('api.sharedself.example.com')
  })

  it('persistOnboardingWizardState throws custom_domain_not_entitled when entitlement is false', async () => {
    const txGet = vi.fn((ref: { path: string }) => {
      if (ref.path === 'users/u1') {
        return Promise.resolve(
          txDocSnap(ref, {
            exists: true,
            data: () => ({
              entitlements: { customDomain: false },
            }),
          })
        )
      }
      return Promise.resolve(txDocSnap(ref, { exists: false }))
    })

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, set: vi.fn(), delete: vi.fn() })
    })

    await expect(
      persistOnboardingWizardState({
        usersCollection: 'users',
        uid: 'u1',
        parsed: {
          currentStep: 'domain',
          completedSteps: [],
          username: null,
          connectedProviderIds: [],
          customDomain: 'api.x.com',
          updatedAt: 't',
        },
      })
    ).rejects.toThrow('custom_domain_not_entitled')
  })
})
