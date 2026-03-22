import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SyncJobQueue } from '../ports/sync-job-queue.js'

vi.mock('../config/backend-paths.js', () => ({
  getDefaultWidgetUserId: vi.fn(() => 'chrisvogt'),
}))

import { planSyncJobs } from './sync-planner.js'

describe('planSyncJobs', () => {
  let syncJobQueue: SyncJobQueue

  beforeEach(() => {
    vi.clearAllMocks()
    syncJobQueue = {
      claimJob: vi.fn(),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(async ({ provider }) => ({
        jobId: `sync-chrisvogt-${provider}`,
        status: 'enqueued',
      })),
      failJob: vi.fn(),
      getJob: vi.fn(),
    }
  })

  it('enqueues all syncable providers', async () => {
    await expect(planSyncJobs(syncJobQueue)).resolves.toEqual({
      enqueuedJobIds: [
        'sync-chrisvogt-discogs',
        'sync-chrisvogt-goodreads',
        'sync-chrisvogt-instagram',
        'sync-chrisvogt-spotify',
        'sync-chrisvogt-steam',
        'sync-chrisvogt-flickr',
      ],
      providerCount: 6,
      result: 'SUCCESS',
      skippedJobIds: [],
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'sync',
      provider: 'steam',
      userId: 'chrisvogt',
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'sync',
      provider: 'spotify',
      userId: 'chrisvogt',
    })
  })

  it('separates enqueued and skipped job ids', async () => {
    let call = 0
    vi.mocked(syncJobQueue.enqueue).mockImplementation(async ({ provider }) => {
      call += 1
      const jobId = `sync-chrisvogt-${provider}`
      return {
        jobId,
        status: call === 1 ? 'skipped' : 'enqueued',
      }
    })

    await expect(planSyncJobs(syncJobQueue)).resolves.toEqual({
      enqueuedJobIds: [
        'sync-chrisvogt-goodreads',
        'sync-chrisvogt-instagram',
        'sync-chrisvogt-spotify',
        'sync-chrisvogt-steam',
        'sync-chrisvogt-flickr',
      ],
      providerCount: 6,
      result: 'SUCCESS',
      skippedJobIds: ['sync-chrisvogt-discogs'],
    })
  })
})
