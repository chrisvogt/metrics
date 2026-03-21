import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { runShadowSyncForProvider } from './shadow-sync-manual.js'

vi.mock('./shadow-sync-worker.js', () => ({
  processShadowSyncJob: vi.fn(() => Promise.resolve({
    jobId: 'shadow-chrisvogt-steam-shadow',
    result: 'SUCCESS',
  })),
}))

import { processShadowSyncJob } from './shadow-sync-worker.js'

describe('runShadowSyncForProvider', () => {
  let documentStore: DocumentStore
  let syncJobQueue: SyncJobQueue

  beforeEach(() => {
    vi.clearAllMocks()
    documentStore = {
      getDocument: vi.fn(),
      setDocument: vi.fn(),
    }
    syncJobQueue = {
      claimJob: vi.fn(async () => ({
        runCount: 1,
        enqueuedAt: '2026-03-21T02:00:00.000Z',
        jobId: 'shadow-chrisvogt-steam-shadow',
        mode: 'shadow',
        provider: 'steam',
        source: 'shadow',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      })),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(async () => ({
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'enqueued' as const,
      })),
      failJob: vi.fn(),
      getJob: vi
        .fn()
        .mockResolvedValueOnce({
          jobId: 'shadow-chrisvogt-steam-shadow',
          status: 'queued',
        })
        .mockResolvedValueOnce({
          jobId: 'shadow-chrisvogt-steam-shadow',
          status: 'completed',
        }),
    }
  })

  it('enqueues, claims, processes, and reloads a shadow sync job', async () => {
    await expect(runShadowSyncForProvider({
      documentStore,
      provider: 'steam',
      syncJobQueue,
      userId: 'chrisvogt',
    })).resolves.toEqual({
      afterJob: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'completed',
      },
      beforeJob: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'queued',
      },
      enqueue: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'enqueued',
      },
      worker: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        result: 'SUCCESS',
      },
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'shadow',
      provider: 'steam',
      source: 'shadow',
      userId: 'chrisvogt',
    })
    expect(processShadowSyncJob).toHaveBeenCalled()
  })

  it('returns NOOP worker status when the job cannot be claimed', async () => {
    vi.mocked(syncJobQueue.claimJob).mockResolvedValueOnce(null)

    await expect(runShadowSyncForProvider({
      documentStore,
      provider: 'steam',
      syncJobQueue,
      userId: 'chrisvogt',
    })).resolves.toEqual({
      afterJob: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'completed',
      },
      beforeJob: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'queued',
      },
      enqueue: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        status: 'enqueued',
      },
      worker: {
        jobId: 'shadow-chrisvogt-steam-shadow',
        result: 'NOOP',
      },
    })
  })
})
