import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SyncJobQueue } from '../ports/sync-job-queue.js'

vi.mock('../config/backend-config.js', () => ({
  getShadowSyncConfig: vi.fn(),
}))

vi.mock('../config/backend-paths.js', () => ({
  getDefaultWidgetUserId: vi.fn(() => 'chrisvogt'),
}))

import { getShadowSyncConfig } from '../config/backend-config.js'
import { planShadowSyncJobs } from './shadow-sync-planner.js'

describe('planShadowSyncJobs', () => {
  let syncJobQueue: SyncJobQueue

  beforeEach(() => {
    vi.clearAllMocks()
    syncJobQueue = {
      claimJob: vi.fn(),
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueue: vi.fn(async ({ provider }) => ({
        jobId: `shadow-chrisvogt-${provider}-shadow`,
        status: 'enqueued',
      })),
      failJob: vi.fn(),
      getJob: vi.fn(),
      listRecentJobs: vi.fn(),
    }
  })

  it('returns NOOP when shadow sync is disabled', async () => {
    vi.mocked(getShadowSyncConfig).mockReturnValue({
      enabled: false,
      providers: [],
    })

    await expect(planShadowSyncJobs(syncJobQueue)).resolves.toEqual({
      enqueuedJobIds: [],
      providerCount: 0,
      result: 'NOOP',
    })
    expect(syncJobQueue.enqueue).not.toHaveBeenCalled()
  })

  it('enqueues configured providers in shadow mode', async () => {
    vi.mocked(getShadowSyncConfig).mockReturnValue({
      enabled: true,
      providers: ['steam', 'spotify'],
    })

    await expect(planShadowSyncJobs(syncJobQueue)).resolves.toEqual({
      enqueuedJobIds: [
        'shadow-chrisvogt-steam-shadow',
        'shadow-chrisvogt-spotify-shadow',
      ],
      providerCount: 2,
      result: 'SUCCESS',
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'shadow',
      provider: 'steam',
      source: 'shadow',
      userId: 'chrisvogt',
    })
    expect(syncJobQueue.enqueue).toHaveBeenCalledWith({
      mode: 'shadow',
      provider: 'spotify',
      source: 'shadow',
      userId: 'chrisvogt',
    })
  })
})
