import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SyncJobQueue } from '../ports/sync-job-queue.js'

vi.mock('../config/backend-paths.js', () => ({
  getDefaultWidgetUserId: vi.fn(() => 'chrisvogt'),
}))

import { planSyncJobs } from './shadow-sync-planner.js'

describe('planSyncJobs', () => {
  let syncJobQueue: SyncJobQueue

  beforeEach(() => {
    vi.clearAllMocks()
    syncJobQueue = {
      claimJob: vi.fn(),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(async ({ provider }) => ({
        jobId: `sync-chrisvogt-${provider}-live`,
        status: 'enqueued',
      })),
      failJob: vi.fn(),
      getJob: vi.fn(),
    }
  })

  it('enqueues all syncable providers in live mode', async () => {
    await expect(planSyncJobs(syncJobQueue)).resolves.toEqual({
      enqueuedJobIds: [
        'sync-chrisvogt-discogs-live',
        'sync-chrisvogt-goodreads-live',
        'sync-chrisvogt-instagram-live',
        'sync-chrisvogt-spotify-live',
        'sync-chrisvogt-steam-live',
        'sync-chrisvogt-flickr-live',
      ],
      providerCount: 6,
      result: 'SUCCESS',
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'sync',
      provider: 'steam',
      source: 'live',
      userId: 'chrisvogt',
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'sync',
      provider: 'spotify',
      source: 'live',
      userId: 'chrisvogt',
    })
  })
})
