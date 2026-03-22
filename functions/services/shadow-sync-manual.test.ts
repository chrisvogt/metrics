import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentStore } from '../ports/document-store.js'
import type { SyncJobQueue } from '../ports/sync-job-queue.js'
import { runSyncForProvider } from './shadow-sync-manual.js'

vi.mock('./shadow-sync-worker.js', () => ({
  processSyncJob: vi.fn(() => Promise.resolve({
    jobId: 'sync-chrisvogt-steam',
    result: 'SUCCESS',
  })),
}))

import { processSyncJob } from './shadow-sync-worker.js'

describe('runSyncForProvider', () => {
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
        jobId: 'sync-chrisvogt-steam',
        mode: 'sync',
        provider: 'steam',
        status: 'processing',
        updatedAt: '2026-03-21T02:00:00.000Z',
        userId: 'chrisvogt',
      })),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(async () => ({
        jobId: 'sync-chrisvogt-steam',
        status: 'enqueued' as const,
      })),
      failJob: vi.fn(),
      getJob: vi
        .fn()
        .mockResolvedValueOnce({
          jobId: 'sync-chrisvogt-steam',
          status: 'queued',
        })
        .mockResolvedValueOnce({
          jobId: 'sync-chrisvogt-steam',
          status: 'completed',
        }),
    }
  })

  it('enqueues, claims, processes, and reloads a sync job', async () => {
    await expect(runSyncForProvider({
      documentStore,
      provider: 'steam',
      syncJobQueue,
      userId: 'chrisvogt',
    })).resolves.toEqual({
      afterJob: {
        jobId: 'sync-chrisvogt-steam',
        status: 'completed',
      },
      beforeJob: {
        jobId: 'sync-chrisvogt-steam',
        status: 'queued',
      },
      enqueue: {
        jobId: 'sync-chrisvogt-steam',
        status: 'enqueued',
      },
      worker: {
        jobId: 'sync-chrisvogt-steam',
        result: 'SUCCESS',
      },
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'sync',
      provider: 'steam',
      userId: 'chrisvogt',
    })
    expect(processSyncJob).toHaveBeenCalled()
  })

  it('returns NOOP worker status when the job cannot be claimed', async () => {
    vi.mocked(syncJobQueue.claimJob).mockResolvedValueOnce(null)

    await expect(runSyncForProvider({
      documentStore,
      provider: 'steam',
      syncJobQueue,
      userId: 'chrisvogt',
    })).resolves.toEqual({
      afterJob: {
        jobId: 'sync-chrisvogt-steam',
        status: 'completed',
      },
      beforeJob: {
        jobId: 'sync-chrisvogt-steam',
        status: 'queued',
      },
      enqueue: {
        jobId: 'sync-chrisvogt-steam',
        status: 'enqueued',
      },
      worker: {
        jobId: 'sync-chrisvogt-steam',
        result: 'NOOP',
      },
    })
  })
})
